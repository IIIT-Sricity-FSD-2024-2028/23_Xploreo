import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import {
  ApiProtectedResource,
  ApiReadEndpoint,
} from './common/decorators/api-docs.decorator';

@Controller()
@ApiProtectedResource()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiReadEndpoint()
  getHello(): string {
    return this.appService.getHello();
  }
}
