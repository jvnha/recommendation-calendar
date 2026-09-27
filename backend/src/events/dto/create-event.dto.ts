import {
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CATEGORY_CODES } from '../../recommender/recommender.types';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsDateString({ strict: true })
  date: string;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:mm' })
  startTime?: string | null;

  @IsOptional()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:mm' })
  endTime?: string | null;

  @IsOptional()
  @Matches(COLOR_REGEX, { message: 'color must be a hex color like #3b82f6' })
  color?: string;

  /** 직접 지정한 카테고리. 생략하거나 null이면 제목/메모로 자동 분류 */
  @IsOptional()
  @IsIn(CATEGORY_CODES)
  category?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationName?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  locationAddress?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number | null;
}
