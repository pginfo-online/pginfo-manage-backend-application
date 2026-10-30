import { Module } from '@nestjs/common';
import { BookingsController } from './api/bookings.controller.js';
import { BookingsService } from './application/bookings.service.js';

@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
  exports: [BookingsService],
})
export class BookingsModule {}
