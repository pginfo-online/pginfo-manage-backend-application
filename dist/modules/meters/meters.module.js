var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { MetersController } from './api/meters.controller.js';
import { MetersService } from './application/meters.service.js';
let MetersModule = class MetersModule {
};
MetersModule = __decorate([
    Module({
        controllers: [MetersController],
        providers: [MetersService],
        exports: [MetersService],
    })
], MetersModule);
export { MetersModule };
//# sourceMappingURL=meters.module.js.map