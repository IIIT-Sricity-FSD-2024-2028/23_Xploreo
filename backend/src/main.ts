import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { setupSwagger } from './docs/swagger.setup';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AppLoggerService } from './common/logger/logger.service';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { RequestIdMiddleware } from './common/middleware/router-level.middleware';
import { RequestResponseLoggingMiddleware } from './common/middleware/router-level.middleware';
import { ApiVersionMiddleware } from './common/middleware/router-level.middleware';
import { corsOptions } from './common/middleware/router-level.middleware';

import * as express from 'express';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const reflector = app.get(Reflector);
  const logger = app.get(AppLoggerService);

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS with options
  app.enableCors(corsOptions);

  // Security Headers Middleware (helmet)
  const securityMiddleware = app.get(SecurityMiddleware);
  app.use(securityMiddleware.use.bind(securityMiddleware));

  // Router-level Middleware
  const requestIdMiddleware = app.get(RequestIdMiddleware);
  app.use(requestIdMiddleware.use.bind(requestIdMiddleware));

  const requestResponseLoggingMiddleware = app.get(
    RequestResponseLoggingMiddleware,
  );
  app.use(
    requestResponseLoggingMiddleware.use.bind(requestResponseLoggingMiddleware),
  );

  const apiVersionMiddleware = app.get(ApiVersionMiddleware);
  app.use(apiVersionMiddleware.use.bind(apiVersionMiddleware));

  // Static file serving for uploads
  const uploadsPath = path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadsPath));

  // Payload limits (for Base64 images)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  // Global interceptors
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor, new ResponseInterceptor());

  // Global guards
  app.useGlobalGuards(new AuthGuard(reflector), new RolesGuard(reflector));

  // Swagger
  setupSwagger(app);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  logger.log(`🚀 Xploreo API running on http://localhost:${port}/api`);
  logger.log(`📚 Swagger docs at  http://localhost:${port}/api/docs`);
}
bootstrap();
