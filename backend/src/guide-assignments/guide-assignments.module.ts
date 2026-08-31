import { Module } from '@nestjs/common';
import { GuideAssignmentsController } from './guide-assignments.controller';
import { GuideAssignmentsService } from './guide-assignments.service';
import { GuideAssignmentsRepository } from './guide-assignments.repository';
import { GuideApplicationsModule } from '../guide-applications/guide-applications.module';
import { GuideModule } from '../guide/guide.module';

@Module({
  imports: [GuideApplicationsModule, GuideModule],
  controllers: [GuideAssignmentsController],
  providers: [GuideAssignmentsService, GuideAssignmentsRepository],
  exports: [GuideAssignmentsService, GuideAssignmentsRepository],
})
export class GuideAssignmentsModule {}
