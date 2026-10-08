import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as fs from 'fs';
import * as path from 'path';

export function setupSwagger(app: INestApplication) {
  const configPath = path.join(process.cwd(), 'src/docs/swagger.config.json');
  const configJson = JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const builder = new DocumentBuilder()
    .setTitle(configJson.info.title)
    .setDescription(configJson.info.description)
    .setVersion(configJson.info.version);

  const document = SwaggerModule.createDocument(app, builder.build());
  SwaggerModule.setup('api/docs', app, document);
}
