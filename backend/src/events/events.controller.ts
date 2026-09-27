import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventsDto } from './dto/query-events.dto';
import { RecommendationsQueryDto } from './dto/recommendations-query.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  /** GET /api/events?from=2026-09-01&to=2026-09-30 */
  @Get()
  findInRange(@Query() query: QueryEventsDto) {
    return this.events.findInRange(query.from, query.to);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.events.findOne(id);
  }

  /** GET /api/events/:id/recommendations?radius=1000 — 일정 카테고리 기반 주변 장소 추천 */
  @Get(':id/recommendations')
  recommendations(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: RecommendationsQueryDto,
  ) {
    return this.events.recommendations(id, query.radius);
  }

  @Post()
  create(@Body() dto: CreateEventDto) {
    return this.events.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEventDto) {
    return this.events.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.events.remove(id);
  }
}
