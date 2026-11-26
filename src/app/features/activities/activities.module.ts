import { NgModule } from '@angular/core';

import { ActivitiesRoutingModule } from './activities-routing.module';
import { ActivityCardComponent } from './activity-card/activity-card.component';
import { ActivityDetailComponent } from './activity-detail/activity-detail.component';
import { ActivityListComponent } from './activity-list/activity-list.component';
import { SharedModule } from '../../shared/shared.module';

/**
 * Employee-facing feature: browsing Service Day opportunities (Use Case 2) and
 * registering for them (Use Case 3).
 *
 * `ActivityCardComponent` is declared but not exported, because it is only
 * ever used inside this feature. Anything genuinely reusable — the slot meter,
 * the status badge — lives in `SharedModule` instead.
 */
@NgModule({
  declarations: [ActivityListComponent, ActivityDetailComponent, ActivityCardComponent],
  imports: [SharedModule, ActivitiesRoutingModule],
})
export class ActivitiesModule {}
