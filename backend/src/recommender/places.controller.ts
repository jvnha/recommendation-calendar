import { Controller, Get, Query } from '@nestjs/common';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { RecommenderService } from './recommender.service';

class SearchPlacesDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  query: string;
}

@Controller()
export class PlacesController {
  constructor(private readonly recommender: RecommenderService) {}

  /** GET /api/categories */
  @Get('categories')
  categories() {
    return this.recommender.categories();
  }

  /** GET /api/places/search?query=강남역 — 일정 위치 입력용 장소 검색 */
  @Get('places/search')
  search(@Query() dto: SearchPlacesDto) {
    return this.recommender.searchPlaces(dto.query);
  }
}
