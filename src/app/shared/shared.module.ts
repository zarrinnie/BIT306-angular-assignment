import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ConfirmDialogComponent } from './components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from './components/loading-spinner/loading-spinner.component';
import { NavIconComponent } from './components/nav-icon/nav-icon.component';
import { PageHeaderComponent } from './components/page-header/page-header.component';
import { SlotMeterComponent } from './components/slot-meter/slot-meter.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { DurationPipe } from './pipes/duration.pipe';
import { TimeRemainingPipe } from './pipes/time-remaining.pipe';

/**
 * Everything that more than one feature needs.
 *
 * The module declares the reusable presentation components and pipes, and
 * re-exports the Angular modules that nearly every feature template depends
 * on. A feature module therefore imports `SharedModule` alone and immediately
 * has `CommonModule`, both forms packages, the router directives and the whole
 * user-interface kit available.
 *
 * It provides no services, so importing it into several lazily loaded feature
 * modules is safe: nothing in it carries state.
 */
const SHARED_DECLARABLES = [
  ConfirmDialogComponent,
  EmptyStateComponent,
  LoadingSpinnerComponent,
  NavIconComponent,
  PageHeaderComponent,
  SlotMeterComponent,
  StatCardComponent,
  StatusBadgeComponent,
  ToastContainerComponent,
  DurationPipe,
  TimeRemainingPipe,
];

const SHARED_MODULES = [CommonModule, FormsModule, ReactiveFormsModule, RouterModule];

@NgModule({
  declarations: SHARED_DECLARABLES,
  imports: SHARED_MODULES,
  exports: [...SHARED_DECLARABLES, ...SHARED_MODULES],
})
export class SharedModule {}
