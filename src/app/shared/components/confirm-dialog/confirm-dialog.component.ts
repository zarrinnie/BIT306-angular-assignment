import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

/**
 * Modal confirmation used before anything irreversible — removing an NGO
 * activity, or withdrawing from one.
 *
 * Written as a component rather than `window.confirm` so the wording can
 * explain the consequence (for example, how many employees will be notified),
 * and so the dialog is styled and labelled like the rest of the application.
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './confirm-dialog.component.html',
  styleUrl: './confirm-dialog.component.css',
})
export class ConfirmDialogComponent {
  readonly open = input(false);
  readonly heading = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Confirm');
  readonly cancelLabel = input('Cancel');
  readonly destructive = input(false);
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
