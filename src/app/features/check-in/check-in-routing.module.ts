import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { ScanComponent } from './scan/scan.component';

/**
 * The address encoded in the QR code: `/check-in/:activityId/:token`.
 * Both parameters reach the component as inputs.
 */
const routes: Routes = [
  { path: ':activityId/:token', component: ScanComponent },
  { path: '', redirectTo: '/my-registrations', pathMatch: 'full' },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CheckInRoutingModule {}
