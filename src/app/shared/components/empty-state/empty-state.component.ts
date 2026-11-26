import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Placeholder for a list with nothing in it. An explanation and a next step
 * are more useful to the user than a blank area of the screen.
 */
@Component({
  selector: 'app-empty-state',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="empty">
      <h3 class="empty__title">{{ title() }}</h3>
      @if (message()) {
        <p class="muted text-sm">{{ message() }}</p>
      }
      <div class="empty__action">
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-7) var(--space-5);
        text-align: center;
        border: 1px dashed var(--color-line-strong);
        border-radius: var(--radius-lg);
        background-color: var(--color-surface);
      }

      .empty__title {
        font-size: var(--text-base);
      }

      .empty__action:empty {
        display: none;
      }

      .empty__action {
        margin-top: var(--space-2);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
