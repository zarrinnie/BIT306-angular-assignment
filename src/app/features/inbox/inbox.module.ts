import { NgModule } from '@angular/core';

import { InboxRoutingModule } from './inbox-routing.module';
import { MessageListComponent } from './message-list/message-list.component';
import { SharedModule } from '../../shared/shared.module';

/**
 * Message inbox feature, shared by both roles (Use Case 5, receiving end).
 */
@NgModule({
  declarations: [MessageListComponent],
  imports: [SharedModule, InboxRoutingModule],
})
export class InboxModule {}
