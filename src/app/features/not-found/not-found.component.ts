import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Shown for any address that does not match a route. */
@Component({
  selector: 'app-not-found',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <section class="card stack">
        <h1>Page not found</h1>
        <p class="muted">
          That address does not exist in the Service Day Dashboard. It may have been mistyped, or
          the activity it pointed to may have been removed by the administrator.
        </p>
        <p><a class="btn btn-primary" routerLink="/">Back to the dashboard</a></p>
      </section>
    </div>
  `,
})
export class NotFoundComponent {}
