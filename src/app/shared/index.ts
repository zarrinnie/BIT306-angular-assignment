/**
 * Public surface of the shared module. Feature code imports the module itself;
 * these exports exist for the few places that need a component's type, for
 * example when a tone is passed into a statistic card.
 */
export * from './shared.module';
export * from './components/stat-card/stat-card.component';
export * from './components/slot-meter/slot-meter.component';
export * from './components/status-badge/status-badge.component';
export * from './components/confirm-dialog/confirm-dialog.component';
export * from './components/empty-state/empty-state.component';
export * from './components/loading-spinner/loading-spinner.component';
export * from './components/nav-icon/nav-icon.component';
export * from './components/page-header/page-header.component';
export * from './components/toast-container/toast-container.component';
export * from './pipes/duration.pipe';
export * from './pipes/time-remaining.pipe';
