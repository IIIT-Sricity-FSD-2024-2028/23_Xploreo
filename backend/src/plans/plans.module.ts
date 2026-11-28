import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlansRepository } from './plans.repository';
import { HotelsModule } from '../hotels/hotels.module';
import { ExperiencesModule } from '../experiences/experiences.module';

@Module({
  // Hotel, room-type and experience repositories validate the inventory a package references.
  imports: [HotelsModule, ExperiencesModule],
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansRepository],
})
export class PlansModule {}
