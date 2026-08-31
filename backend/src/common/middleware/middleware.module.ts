import { Module, Global } from '@nestjs/common';
import { LoggerModule } from '../logger/logger.module';
import { FileUploadMiddleware } from './file-upload.middleware';
import { SecurityMiddleware } from './security.middleware';
import { RateLimitMiddleware } from './rate-limit.middleware';
import {
  RequestIdMiddleware,
  RequestResponseLoggingMiddleware,
  ApiVersionMiddleware,
} from './router-level.middleware';
import { HttpExceptionFilter } from '../filters/http-exception.filter';
import { LoggingInterceptor } from '../interceptors/logging.interceptor';

@Global()
@Module({
  imports: [LoggerModule],
  providers: [
    FileUploadMiddleware,
    SecurityMiddleware,
    RateLimitMiddleware,
    RequestIdMiddleware,
    RequestResponseLoggingMiddleware,
    ApiVersionMiddleware,
    HttpExceptionFilter,
    LoggingInterceptor,
  ],
  exports: [
    FileUploadMiddleware,
    SecurityMiddleware,
    RateLimitMiddleware,
    RequestIdMiddleware,
    RequestResponseLoggingMiddleware,
    ApiVersionMiddleware,
    HttpExceptionFilter,
    LoggingInterceptor,
  ],
})
export class MiddlewareModule {}
