import { Module } from '@nestjs/common';
import { ExpensesController } from './api/expenses.controller.js';
import { ExpensesService } from './application/expenses.service.js';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
