import {
  Injectable,
  Scope,
  LoggerService as NestLoggerService,
} from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const errorLogDir = path.join(logDir, 'errors');
if (!fs.existsSync(errorLogDir)) {
  fs.mkdirSync(errorLogDir, { recursive: true });
}

const combinedLogDir = path.join(logDir, 'combined');
if (!fs.existsSync(combinedLogDir)) {
  fs.mkdirSync(combinedLogDir, { recursive: true });
}

const errorTransport = new DailyRotateFile({
  filename: path.join(errorLogDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? '\n' + stack : ''} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    }),
  ),
});

const combinedTransport = new DailyRotateFile({
  filename: path.join(combinedLogDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    }),
  ),
});

const consoleTransport = new winston.transports.Console({
  format: winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    }),
  ),
});

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  transports: [errorTransport, combinedTransport, consoleTransport],
  exceptionHandlers: [
    new DailyRotateFile({
      filename: path.join(errorLogDir, 'exceptions-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
  rejectionHandlers: [
    new DailyRotateFile({
      filename: path.join(errorLogDir, 'rejections-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
    }),
  ],
});

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: any, context?: string) {
    winstonLogger.info(message, { context: context || this.context });
  }

  error(message: any, trace?: string, context?: string) {
    winstonLogger.error(message, {
      context: context || this.context,
      stack: trace,
    });
  }

  warn(message: any, context?: string) {
    winstonLogger.warn(message, { context: context || this.context });
  }

  debug(message: any, context?: string) {
    winstonLogger.debug(message, { context: context || this.context });
  }

  verbose(message: any, context?: string) {
    winstonLogger.verbose(message, { context: context || this.context });
  }

  getWinstonLogger() {
    return winstonLogger;
  }
}

export const loggerInstance = winstonLogger;
