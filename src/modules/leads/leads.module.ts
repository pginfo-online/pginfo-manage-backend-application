import { Module } from '@nestjs/common';
import { LeadsController } from './api/leads.controller.js';
import { LeadsService } from './application/leads.service.js';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
  exports: [LeadsService],
})
export class LeadsModule {}
