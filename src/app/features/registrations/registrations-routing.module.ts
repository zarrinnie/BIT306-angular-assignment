import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { MyRegistrationsComponent } from './my-registrations/my-registrations.component';

const routes: Routes = [{ path: '', component: MyRegistrationsComponent }];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class RegistrationsRoutingModule {}
