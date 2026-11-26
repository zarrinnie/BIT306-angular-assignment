import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { ToastService } from '../../../core/services/toast.service';

/**
 * Renders the queue held by {@link ToastService} in the corner of the screen.
 *
 * Mounted once in the application shell. `aria-live="polite"` means a
 * confirmation or a refusal is announced to screen-reader users as well as
 * shown, and nothing ever blocks the page the way a modal alert would.
 */
@Component({
  selector: 'app-toast-container',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-container.component.html',
  styleUrl: './toast-container.component.css',
})
export class ToastContainerComponent {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.toasts;

  dismiss(id: number): void {
    this.toastService.dismiss(id);
  }
}
