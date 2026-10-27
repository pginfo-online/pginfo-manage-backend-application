import { Module } from '@nestjs/common';
import { PropertiesController } from './api/properties.controller.js';
import { RoomsController } from './api/rooms.controller.js';
import { PropertiesService } from './application/properties.service.js';
import { RoomsService } from './application/rooms.service.js';

@Module({
  controllers: [PropertiesController, RoomsController],
  providers: [PropertiesService, RoomsService],
  exports: [PropertiesService, RoomsService],
})
export class PropertyOperationsModule {}
