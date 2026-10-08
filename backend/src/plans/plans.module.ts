import { Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlansRepository } from './plans.repository';

@Module({
  imports: [],
  controllers: [PlansController],
  providers: [PlansService, PlansRepository],
  exports: [PlansRepository],
})
export class PlansModule {}
