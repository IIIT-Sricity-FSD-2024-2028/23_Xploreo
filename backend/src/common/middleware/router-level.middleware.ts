import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID as uuidv4 } from 'crypto';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req['requestId'] = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
  }
}

@Injectable()
export class RequestResponseLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) { }

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    const requestId = req['requestId'] || 'unknown';
    const { method, originalUrl, ip, headers } = req;

    this.logger.log(
      `Incoming Request: ${method} ${originalUrl}`,
      `RequestId: ${requestId}, IP: ${ip}, User-Agent: ${headers['user-agent']}`,
    );

    const originalSend = res.send.bind(res);
    res.send = (body?: any): Response => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const logLevel = statusCode >= 400 ? 'warn' : 'log';

      const message = `Outgoing Response: ${method} ${originalUrl} - ${statusCode} (${duration}ms)`;

      if (logLevel === 'warn') {
        this.logger.warn(
          message,
          `RequestId: ${requestId}, Status: ${statusCode}`,
        );
      } else {
        this.logger.log(
          message,
          `RequestId: ${requestId}, Status: ${statusCode}`,
        );
      }

      return originalSend(body);
    };

    next();
  }
}

@Injectable()
export class ApiVersionMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.setHeader('X-API-Version', '1.0.0');
    res.setHeader('X-Powered-By', 'Xploreo');
    next();
  }
}

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  req['requestId'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};

export const corsOptions = {
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5500',
      process.env.FRONTEND_URL || 'http://localhost:3000',
    ];

    const isLocalhost =
      origin &&
      (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:'));

    if (!origin || allowedOrigins.includes(origin) || isLocalhost) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'X-User-Role',
    'X-User-ID',
    'X-User-Location',
  ],
  exposedHeaders: [
    'X-Request-ID',
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset',
  ],
  maxAge: 86400,
};
