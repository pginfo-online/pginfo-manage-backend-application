import { Module } from '@nestjs/common';
import { StaffController } from './api/staff.controller.js';
import { StaffService } from './application/staff.service.js';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
  exports: [StaffService],
})
export class StaffModule {}
