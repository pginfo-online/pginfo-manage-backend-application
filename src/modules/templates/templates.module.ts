import { Module } from '@nestjs/common';
import { TemplatesController } from './api/templates.controller.js';
import { TemplatesService } from './application/templates.service.js';

@Module({
  controllers: [TemplatesController],
  providers: [TemplatesService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
