import { DestroyRef, inject, Injectable, signal } from '@angular/core';

/** Visual tone of a toast message. */
export type ToastTone = 'success' | 'error' | 'info';

/** A short-lived message shown in the corner of the screen. */
export interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
}

/**
 * Queue of transient messages rendered by `ToastContainerComponent`.
 *
 * Feedback is delivered this way rather than through `window.alert`, so the
 * page is never blocked and the user keeps the context of what they were doing.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly queue = signal<Toast[]>([]);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private sequence = 0;

  /** The messages currently on screen, newest last. */
  readonly toasts = this.queue.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.timers.forEach((timer) => clearTimeout(timer));
      this.timers.clear();
    });
  }

  success(message: string): void {
    this.push('success', message);
  }

  error(message: string): void {
    this.push('error', message, 7000);
  }

  info(message: string): void {
    this.push('info', message);
  }

  /** Removes a message, either when it times out or when the user closes it. */
  dismiss(id: number): void {
    this.queue.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  private push(tone: ToastTone, message: string, lifetimeMs = 5000): void {
    const id = ++this.sequence;
    this.queue.update((toasts) => [...toasts, { id, tone, message }]);

    const timer = setTimeout(() => {
      this.dismiss(id);
      this.timers.delete(timer);
    }, lifetimeMs);
    this.timers.add(timer);
  }
}
