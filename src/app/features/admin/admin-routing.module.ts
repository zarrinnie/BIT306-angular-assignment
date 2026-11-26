import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ActivityFormComponent } from './activity-form/activity-form.component';
import { ActivityManageComponent } from './activity-manage/activity-manage.component';
import { CheckInConsoleComponent } from './check-in-console/check-in-console.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { ParticipationComponent } from './participation/participation.component';

/**
 * Child routes of `/admin`. The whole branch is already behind
 * `administratorGuard` in the root route table, so no route here needs its own
 * guard.
 */
const routes: Routes = [
  { path: '', component: DashboardComponent, title: 'Service Day overview' },
  { path: 'activities', component: ActivityManageComponent, title: 'NGO availability' },
  { path: 'activities/new', component: ActivityFormComponent, title: 'Add NGO activity' },
  { path: 'activities/:id/edit', component: ActivityFormComponent, title: 'Edit NGO activity' },
  { path: 'participation', component: ParticipationComponent, title: 'Participation' },
  { path: 'notifications', component: NotificationsComponent, title: 'Notifications' },
  { path: 'check-in', component: CheckInConsoleComponent, title: 'Check-in and attendance' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
