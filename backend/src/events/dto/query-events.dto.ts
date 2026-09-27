import { IsDateString } from 'class-validator';

export class QueryEventsDto {
  @IsDateString({ strict: true })
  from: string;

  @IsDateString({ strict: true })
  to: string;
}
