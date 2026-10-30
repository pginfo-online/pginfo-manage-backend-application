import { Module } from '@nestjs/common';
import { ReviewsController } from './api/reviews.controller.js';
import { ReviewsService } from './application/reviews.service.js';

@Module({
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
