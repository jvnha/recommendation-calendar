import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { RecommenderService } from '../recommender/recommender.service';
import type { NearbyPlaces } from '../recommender/recommender.types';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CalendarEvent } from './event.entity';

const ETC_CATEGORY = 'ETC';
const DEFAULT_RADIUS = 1000;

export interface Recommendations {
  /** 지연 분류가 일어났을 수 있으므로 최신 일정 정보를 함께 반환 */
  event: CalendarEvent;
  radius: number;
  mode: NearbyPlaces['mode'];
  query: string | null;
  places: NearbyPlaces['places'];
  /** 추천 목록이 비어 있는 이유 (정상 조회면 null) */
  reason: 'unclassified' | 'not-recommendable' | 'no-location' | null;
}

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(CalendarEvent)
    private readonly repo: Repository<CalendarEvent>,
    private readonly recommender: RecommenderService,
  ) {}

  findInRange(from: string, to: string): Promise<CalendarEvent[]> {
    if (from > to) throw new BadRequestException('from must be before or equal to to');
    return this.repo.find({
      where: { date: Between(from, to) },
      order: { date: 'ASC', startTime: { direction: 'ASC', nulls: 'FIRST' }, id: 'ASC' },
    });
  }

  async findOne(id: number): Promise<CalendarEvent> {
    const event = await this.repo.findOneBy({ id });
    if (!event) throw new NotFoundException(`Event ${id} not found`);
    return event;
  }

  async create(dto: CreateEventDto): Promise<CalendarEvent> {
    const event = this.repo.create(dto);
    this.assertValid(event);
    await this.applyCategory(event, dto.category);
    return this.repo.save(event);
  }

  async update(id: number, dto: UpdateEventDto): Promise<CalendarEvent> {
    const event = await this.findOne(id);
    const textChanged =
      (dto.title !== undefined && dto.title !== event.title) ||
      (dto.description !== undefined && (dto.description ?? null) !== event.description);
    Object.assign(event, dto);
    this.assertValid(event);

    if (dto.category !== undefined) {
      await this.applyCategory(event, dto.category);
    } else if (textChanged && event.categoryMethod !== 'manual') {
      await this.applyCategory(event, null);
    }
    return this.repo.save(event);
  }

  async remove(id: number): Promise<void> {
    const result = await this.repo.delete(id);
    if (!result.affected) throw new NotFoundException(`Event ${id} not found`);
  }

  /** 일정 카테고리와 일치하는 주변 장소 목록 */
  async recommendations(id: number, radius = DEFAULT_RADIUS): Promise<Recommendations> {
    let event = await this.findOne(id);

    // 분류 서비스가 꺼져 있을 때 저장된 일정은 조회 시점에 다시 분류 시도
    if (!event.category) {
      await this.applyCategory(event, null);
      if (event.category) event = await this.repo.save(event);
    }

    const empty = (reason: Recommendations['reason']): Recommendations => ({
      event,
      radius,
      mode: 'none',
      query: null,
      places: [],
      reason,
    });
    if (!event.category) return empty('unclassified');
    if (event.category === ETC_CATEGORY) return empty('not-recommendable');
    if (event.latitude == null || event.longitude == null) return empty('no-location');

    const nearby = await this.recommender.nearbyPlaces(
      event.category,
      event.categoryKeyword,
      event.longitude,
      event.latitude,
      radius,
    );
    return { event, radius, ...nearby, reason: null };
  }

  /** manual 코드가 있으면 수동 지정, 없으면 제목/메모로 자동 분류 */
  private async applyCategory(event: CalendarEvent, manual: string | null | undefined) {
    if (manual) {
      event.category = manual;
      event.categoryMethod = 'manual';
      event.categoryScore = null;
      event.categoryKeyword = null;
      return;
    }
    const result = await this.recommender.classify(event.title, event.description ?? null);
    event.category = result?.code ?? null;
    event.categoryMethod = result?.method ?? null;
    event.categoryScore = result?.score ?? null;
    event.categoryKeyword = result?.matchedKeyword ?? null;
  }

  private assertValid(event: CalendarEvent) {
    if (event.startTime && event.endTime && event.startTime > event.endTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
    if ((event.latitude == null) !== (event.longitude == null)) {
      throw new BadRequestException('latitude and longitude must be provided together');
    }
  }
}
