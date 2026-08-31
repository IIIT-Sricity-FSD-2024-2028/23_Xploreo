import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { AppLoggerService } from '../logger/logger.service';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = path.join(uploadDir, 'images');
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    cb(null, subDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Invalid file type. Only JPEG, PNG, GIF, WebP, and PDF are allowed.',
      ),
    );
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 5,
  },
});

@Injectable()
export class FileUploadMiddleware implements NestMiddleware {
  constructor(private readonly logger: AppLoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const uploadMiddleware = upload.array('files', 5);
    uploadMiddleware(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        this.logger.error(
          `Multer error: ${err.message}`,
          err.stack,
          'FileUploadMiddleware',
        );
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: `File upload error: ${err.message}`,
          timestamp: new Date().toISOString(),
        });
      } else if (err) {
        this.logger.error(
          `File upload error: ${err.message}`,
          err.stack,
          'FileUploadMiddleware',
        );
        return res.status(400).json({
          success: false,
          statusCode: 400,
          message: err.message,
          timestamp: new Date().toISOString(),
        });
      }
      next();
    });
  }
}

export const fileUploadMiddleware = upload.array('files', 5);
export const singleFileUpload = upload.single('file');
