import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * The heading block that opens every page: an optional eyebrow label, the
 * title, a short explanation and a slot for the page's primary actions.
 *
 * Having one component for this keeps the heading markup — and its semantics —
 * identical on all nine screens.
 */
@Component({
  selector: 'app-page-header',
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './page-header.component.html',
  styleUrl: './page-header.component.css',
})
export class PageHeaderComponent {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
