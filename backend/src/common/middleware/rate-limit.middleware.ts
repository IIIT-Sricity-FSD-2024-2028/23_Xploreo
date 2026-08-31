import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AppLoggerService } from '../logger/logger.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requestCounts = new Map<
    string,
    { count: number; resetTime: number }
  >();
  private readonly windowMs = 60 * 1000;
  private readonly maxRequests = 100;

  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.path}`;

    const record = this.requestCounts.get(key);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(key, { count: 1, resetTime: now + this.windowMs });
      this.setRateLimitHeaders(res, this.maxRequests - 1, this.windowMs);
      return next();
    }

    if (record.count >= this.maxRequests) {
      this.logger.warn(
        `Rate limit exceeded for IP: ${ip} on path: ${req.path}`,
        'RateLimitMiddleware',
      );
      res.set(
        'Retry-After',
        Math.ceil((record.resetTime - now) / 1000).toString(),
      );
      this.setRateLimitHeaders(res, 0, record.resetTime - now);
      return res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
      });
    }

    record.count++;
    this.setRateLimitHeaders(
      res,
      this.maxRequests - record.count,
      record.resetTime - now,
    );
    next();
  }

  private setRateLimitHeaders(
    res: Response,
    remaining: number,
    resetTime: number,
  ) {
    res.set('X-RateLimit-Limit', this.maxRequests.toString());
    res.set('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.set(
      'X-RateLimit-Reset',
      Math.ceil((Date.now() + resetTime) / 1000).toString(),
    );
  }
}

export const createRateLimitMiddleware = (
  options: { windowMs?: number; maxRequests?: number } = {},
) => {
  const windowMs = options.windowMs || 60 * 1000;
  const maxRequests = options.maxRequests || 100;
  const requestCounts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${ip}:${req.path}`;

    const record = requestCounts.get(key);

    if (!record || now > record.resetTime) {
      requestCounts.set(key, { count: 1, resetTime: now + windowMs });
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', (maxRequests - 1).toString());
      res.set(
        'X-RateLimit-Reset',
        Math.ceil((now + windowMs) / 1000).toString(),
      );
      return next();
    }

    if (record.count >= maxRequests) {
      res.set(
        'Retry-After',
        Math.ceil((record.resetTime - now) / 1000).toString(),
      );
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', '0');
      res.set(
        'X-RateLimit-Reset',
        Math.ceil(record.resetTime / 1000).toString(),
      );
      return res.status(429).json({
        success: false,
        statusCode: 429,
        message: 'Too many requests, please try again later',
        timestamp: new Date().toISOString(),
      });
    }

    record.count++;
    res.set('X-RateLimit-Limit', maxRequests.toString());
    res.set('X-RateLimit-Remaining', (maxRequests - record.count).toString());
    res.set('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000).toString());
    next();
  };
};

export const strictRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
});
export const authRateLimit = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});
