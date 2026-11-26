import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The icons the navigation rail can draw. */
export type NavIconName =
  | 'overview'
  | 'activities'
  | 'participation'
  | 'notifications'
  | 'check-in'
  | 'registrations'
  | 'inbox'
  | 'sign-out';

/**
 * One small line icon, drawn inline as SVG.
 *
 * The icons are written by hand rather than pulled from an icon package: the
 * application carries no icon dependency, every glyph inherits its colour from
 * `currentColor` so it follows the navigation's active and hover states, and
 * each one is marked `aria-hidden` because the link's own text is the label a
 * screen reader should read.
 */
@Component({
  selector: 'app-nav-icon',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      class="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('overview') {
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9.5 21v-6h5v6" />
        }
        @case ('activities') {
          <path d="M12 21s-7-4.6-7-10a7 7 0 1 1 14 0c0 5.4-7 10-7 10Z" />
          <circle cx="12" cy="11" r="2.5" />
        }
        @case ('participation') {
          <path d="M4 20V10" />
          <path d="M10 20V4" />
          <path d="M16 20v-7" />
          <path d="M22 20H2" />
        }
        @case ('notifications') {
          <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" />
          <path d="M10.5 19a2 2 0 0 0 3 0" />
        }
        @case ('check-in') {
          <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <path d="M13.5 13.5h3v3" />
          <path d="M20.5 17.5v3h-3" />
        }
        @case ('registrations') {
          <path d="M6 3.5h12a1 1 0 0 1 1 1v16l-7-3.5L5 20.5v-16a1 1 0 0 1 1-1Z" />
          <path d="M9 9.5l2 2 4-4" />
        }
        @case ('inbox') {
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        }
        @case ('sign-out') {
          <path d="M14 20H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8" />
          <path d="m17 15 3-3-3-3" />
          <path d="M20 12H10" />
        }
      }
    </svg>
  `,
  styles: `
    .nav-icon {
      flex: none;
      width: 1.15rem;
      height: 1.15rem;
    }
  `,
})
export class NavIconComponent {
  readonly name = input.required<NavIconName>();
}
