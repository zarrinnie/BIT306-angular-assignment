import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ActivityDetailComponent } from './activity-detail/activity-detail.component';
import { ActivityListComponent } from './activity-list/activity-list.component';

/**
 * Child routes of `/activities`. The `:id` parameter is delivered to
 * `ActivityDetailComponent` as a component input, because the root router is
 * configured with `bindToComponentInputs`.
 */
const routes: Routes = [
  { path: '', component: ActivityListComponent },
  { path: ':id', component: ActivityDetailComponent, title: 'Activity details' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ActivitiesRoutingModule {}
