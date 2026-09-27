import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { RecommenderService } from './recommender.service';

@Module({
  controllers: [PlacesController],
  providers: [RecommenderService],
  exports: [RecommenderService],
})
export class RecommenderModule {}
