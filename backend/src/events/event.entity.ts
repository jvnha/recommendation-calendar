import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('events')
export class CalendarEvent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** YYYY-MM-DD */
  @Index()
  @Column({ type: 'date' })
  date: string;

  /** HH:mm (종일 일정이면 null) */
  @Column({ type: 'time', nullable: true })
  startTime: string | null;

  @Column({ type: 'time', nullable: true })
  endTime: string | null;

  @Column({ length: 20, default: '#3b82f6' })
  color: string;

  /** 카카오 category_group_code 또는 'ETC'(기타). 분류 서비스 장애 시 null */
  @Column({ type: 'varchar', length: 10, nullable: true })
  category: string | null;

  /** keyword | similarity | fallback | manual */
  @Column({ type: 'varchar', length: 20, nullable: true })
  categoryMethod: string | null;

  @Column({ type: 'real', nullable: true })
  categoryScore: number | null;

  /** 키워드로 분류된 경우 매칭된 키워드. 장소 키워드면 추천 시 카카오 키워드 검색어로 쓰인다 */
  @Column({ type: 'varchar', length: 50, nullable: true })
  categoryKeyword: string | null;

  /** 일정 위치 (카카오 장소 검색 결과에서 선택) */
  @Column({ type: 'varchar', length: 200, nullable: true })
  locationName: string | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  locationAddress: string | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number | null;

  @Column({ type: 'double precision', nullable: true })
  longitude: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
