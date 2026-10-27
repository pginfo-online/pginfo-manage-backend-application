import { Module } from '@nestjs/common';
import { ComplaintsController } from './api/complaints.controller.js';
import { ComplaintsService } from './application/complaints.service.js';

@Module({
  controllers: [ComplaintsController],
  providers: [ComplaintsService],
  exports: [ComplaintsService],
})
export class MaintenanceModule {}
