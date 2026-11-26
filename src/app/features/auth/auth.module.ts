import { NgModule } from '@angular/core';

import { AuthRoutingModule } from './auth-routing.module';
import { LoginComponent } from './login/login.component';
import { SharedModule } from '../../shared/shared.module';

/**
 * Sign-in feature.
 *
 * Loaded lazily by the root route table. `AuthService` itself lives in
 * `CoreModule`, because the signed-in user has to outlive this module.
 */
@NgModule({
  declarations: [LoginComponent],
  imports: [SharedModule, AuthRoutingModule],
})
export class AuthModule {}
