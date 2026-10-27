import { Module } from '@nestjs/common';
import { ResidentsController } from './api/residents.controller.js';
import { ResidentsService } from './application/residents.service.js';

@Module({
  controllers: [ResidentsController],
  providers: [ResidentsService],
  exports: [ResidentsService],
})
export class OccupancyModule {}
