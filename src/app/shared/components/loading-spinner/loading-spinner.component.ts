import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Shown while a request is in flight. `aria-live` means assistive technology
 * announces the wait instead of leaving the user with a silent, empty page.
 */
@Component({
  selector: 'app-loading-spinner',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="loader" role="status" aria-live="polite">
      <span class="loader__ring" aria-hidden="true"></span>
      <span class="loader__label">{{ label() }}</span>
    </div>
  `,
  styles: [
    `
      .loader {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--space-3);
        padding: var(--space-6);
        color: var(--color-ink-500);
      }

      .loader__ring {
        width: 1.25rem;
        height: 1.25rem;
        border: 2px solid var(--color-primary-100);
        border-top-color: var(--color-primary-600);
        border-radius: 50%;
        animation: loader-spin 700ms linear infinite;
      }

      .loader__label {
        font-size: var(--text-sm);
      }

      @keyframes loader-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class LoadingSpinnerComponent {
  readonly label = input('Loading…');
}
