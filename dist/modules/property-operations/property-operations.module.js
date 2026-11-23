var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { PropertiesController } from './api/properties.controller.js';
import { RoomsController } from './api/rooms.controller.js';
import { PropertiesService } from './application/properties.service.js';
import { RoomsService } from './application/rooms.service.js';
let PropertyOperationsModule = class PropertyOperationsModule {
};
PropertyOperationsModule = __decorate([
    Module({
        controllers: [PropertiesController, RoomsController],
        providers: [PropertiesService, RoomsService],
        exports: [PropertiesService, RoomsService],
    })
], PropertyOperationsModule);
export { PropertyOperationsModule };
//# sourceMappingURL=property-operations.module.js.map