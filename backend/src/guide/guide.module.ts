import { Module } from '@nestjs/common';
import { GuideService } from './guide.service';
import { GuideController } from './guide.controller';
import { GuideRepository } from './guide.repository';

@Module({
  controllers: [GuideController],
  providers: [GuideService, GuideRepository],
  exports: [GuideRepository],
})
export class GuideModule {}
