var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { ExpensesController } from './api/expenses.controller.js';
import { ExpensesService } from './application/expenses.service.js';
let ExpensesModule = class ExpensesModule {
};
ExpensesModule = __decorate([
    Module({
        controllers: [ExpensesController],
        providers: [ExpensesService],
        exports: [ExpensesService],
    })
], ExpensesModule);
export { ExpensesModule };
//# sourceMappingURL=expenses.module.js.map