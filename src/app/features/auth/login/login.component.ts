import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { apiErrorMessage } from '../../../core/services/http-error.util';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

/** A pre-filled demonstration account, offered as a one-click shortcut. */
interface DemoAccount {
  role: string;
  name: string;
  email: string;
  password: string;
  description: string;
}

/**
 * Sign-in page.
 *
 * Every use case in the case study begins with the actor logging in, and the
 * role decided here is what the route guards and the navigation use afterwards.
 *
 * The credentials are checked by the simulated back end over HTTP, so the form
 * behaves exactly as it would against a real authentication endpoint: the
 * button is disabled while the request is in flight and a rejected sign-in
 * comes back as HTTP 401 with a message.
 */
@Component({
  selector: 'app-login',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly submitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  /** Shown on the page so the prototype can be assessed without a user list. */
  readonly demoAccounts: readonly DemoAccount[] = [
    {
      role: 'Administrator',
      name: 'Nurul Aisyah Rahman',
      email: 'admin@servicedayco.com',
      password: 'admin123',
      description: 'Manages NGO availability, monitors participation and sends notifications.',
    },
    {
      role: 'Employee',
      name: 'Alia Hassan',
      email: 'alia.hassan@servicedayco.com',
      password: 'staff123',
      description: 'Views Service Day opportunities and manages her own registrations.',
    },
  ];

  /** Fills the form from one of the demonstration accounts. */
  useAccount(account: DemoAccount): void {
    this.form.setValue({ email: account.email, password: account.password });
    this.errorMessage.set(null);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.signIn(this.form.getRawValue()).subscribe({
      next: (response) => {
        this.submitting.set(false);
        this.toast.success(`Signed in as ${response.user.fullName}.`);
        void this.router.navigateByUrl(this.destinationFor(response.user.role));
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(apiErrorMessage(error, 'Sign-in failed. Please try again.'));
      },
    });
  }

  /** Honours a `redirectTo` from the guard, otherwise uses the role's home page. */
  private destinationFor(role: string): string {
    const redirectTo = new URLSearchParams(window.location.search).get('redirectTo');
    if (redirectTo && !redirectTo.startsWith('/login')) {
      return redirectTo;
    }
    return role === 'administrator' ? '/admin' : '/activities';
  }
}
