import { Module } from '@nestjs/common';
import { MetersController } from './api/meters.controller.js';
import { MetersService } from './application/meters.service.js';

@Module({
  controllers: [MetersController],
  providers: [MetersService],
  exports: [MetersService],
})
export class MetersModule {}
