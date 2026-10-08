import { Module } from '@nestjs/common';
import { GuideApplicationsController } from './guide-applications.controller';
import { GuideApplicationsService } from './guide-applications.service';
import { GuideApplicationsRepository } from './guide-applications.repository';
import { GuideModule } from '../guide/guide.module';
import { PlansModule } from '../plans/plans.module';

@Module({
  imports: [GuideModule, PlansModule],
  controllers: [GuideApplicationsController],
  providers: [GuideApplicationsService, GuideApplicationsRepository],
  exports: [GuideApplicationsService, GuideApplicationsRepository],
})
export class GuideApplicationsModule {}
