import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommenderModule } from '../recommender/recommender.module';
import { CalendarEvent } from './event.entity';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [TypeOrmModule.forFeature([CalendarEvent]), RecommenderModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
