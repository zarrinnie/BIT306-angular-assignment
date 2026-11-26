import { NgModule } from '@angular/core';

import { MyRegistrationsComponent } from './my-registrations/my-registrations.component';
import { RegistrationsRoutingModule } from './registrations-routing.module';
import { SharedModule } from '../../shared/shared.module';

/**
 * Managing one's own participation: changing activity and withdrawing before
 * the cut-off (Use Case 3).
 */
@NgModule({
  declarations: [MyRegistrationsComponent],
  imports: [SharedModule, RegistrationsRoutingModule],
})
export class RegistrationsModule {}
