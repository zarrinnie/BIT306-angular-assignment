import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NavIconName } from './shared/components/nav-icon/nav-icon.component';
import { AuthService } from './core/services/auth.service';
import { NotificationService } from './core/services/notification.service';

/** One entry in the main navigation. */
interface NavLink {
  label: string;
  path: string;
  exact: boolean;
  /** Which glyph the navigation rail draws beside the label. */
  icon: NavIconName;
}

/**
 * The application shell.
 *
 * It owns the page frame — the navigation rail, the router outlet and the
 * footer — and nothing else. Which links appear is decided from the signed-in
 * user's role, so an employee never sees the administration area and the
 * navigation rebuilds itself the instant somebody signs in or out.
 */
@Component({
  selector: 'app-root',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly auth = inject(AuthService);
  private readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  readonly currentUser = this.auth.currentUser;
  readonly isSignedIn = this.auth.isSignedIn;
  readonly isAdministrator = this.auth.isAdministrator;
  readonly initials = this.auth.initials;
  readonly unreadCount = this.notifications.unreadCount;

  /** Open/closed state of the navigation on a narrow screen. */
  readonly menuOpen = signal(false);

  readonly roleLabel = computed(() =>
    this.isAdministrator() ? 'Service Day administrator' : 'Employee volunteer',
  );

  /** Role-aware navigation. */
  readonly links = computed<NavLink[]>(() => {
    if (!this.isSignedIn()) {
      return [];
    }
    if (this.isAdministrator()) {
      return [
        { label: 'Overview', path: '/admin', exact: true, icon: 'overview' },
        { label: 'NGO activities', path: '/admin/activities', exact: false, icon: 'activities' },
        { label: 'Participation', path: '/admin/participation', exact: false, icon: 'participation' },
        { label: 'Notifications', path: '/admin/notifications', exact: false, icon: 'notifications' },
        { label: 'Check-in', path: '/admin/check-in', exact: false, icon: 'check-in' },
      ];
    }
    return [
      { label: 'Opportunities', path: '/activities', exact: false, icon: 'activities' },
      { label: 'My registrations', path: '/my-registrations', exact: false, icon: 'registrations' },
    ];
  });

  constructor() {
    // Load the signed-in user's messages, and reload them whenever the
    // signed-in user changes. The unread counter in the masthead then keeps
    // itself up to date without any page reload.
    effect(() => {
      if (this.auth.isSignedIn()) {
        this.notifications.loadMine().subscribe({ error: () => undefined });
      }
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  signOut(): void {
    this.auth.signOut();
    this.closeMenu();
    void this.router.navigate(['/login']);
  }
}
