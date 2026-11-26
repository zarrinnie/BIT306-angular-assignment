import { NgModule } from '@angular/core';

import { CheckInRoutingModule } from './check-in-routing.module';
import { ScanComponent } from './scan/scan.component';
import { SharedModule } from '../../shared/shared.module';

/**
 * Employee side of the QR check-in (Use Case 6). The administrator's QR
 * generator and live attendance board live in the administration feature,
 * because they are only available to that role.
 */
@NgModule({
  declarations: [ScanComponent],
  imports: [SharedModule, CheckInRoutingModule],
})
export class CheckInModule {}
