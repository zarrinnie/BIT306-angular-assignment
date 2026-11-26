import { NgModule } from '@angular/core';

import { ActivityFormComponent } from './activity-form/activity-form.component';
import { ActivityManageComponent } from './activity-manage/activity-manage.component';
import { AdminRoutingModule } from './admin-routing.module';
import { CheckInConsoleComponent } from './check-in-console/check-in-console.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { NotificationsComponent } from './notifications/notifications.component';
import { ParticipationComponent } from './participation/participation.component';
import { SharedModule } from '../../shared/shared.module';
import { UtilisationChartComponent } from './utilisation-chart/utilisation-chart.component';

/**
 * The administration area: managing NGO availability (Use Case 1), monitoring
 * participation and slot utilisation (Use Case 4), notifications and reminders
 * (Use Case 5) and QR check-in with its attendance reports (Use Case 6).
 *
 * Loaded lazily, and only ever reachable by an administrator, so an employee's
 * browser never downloads this code at all.
 */
@NgModule({
  declarations: [
    DashboardComponent,
    ActivityManageComponent,
    ActivityFormComponent,
    ParticipationComponent,
    NotificationsComponent,
    CheckInConsoleComponent,
    UtilisationChartComponent,
  ],
  imports: [SharedModule, AdminRoutingModule],
})
export class AdminModule {}
