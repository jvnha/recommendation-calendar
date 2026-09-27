export type CategoryMethod = 'keyword' | 'similarity' | 'fallback' | 'manual';

export interface CalendarEvent {
  id: number;
  title: string;
  description: string | null;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm:ss (종일 일정이면 null) */
  startTime: string | null;
  endTime: string | null;
  color: string;
  /** 카카오 category_group_code 또는 'ETC'. 미분류면 null */
  category: string | null;
  categoryMethod: CategoryMethod | null;
  categoryScore: number | null;
  /** 키워드로 분류된 경우 매칭된 키워드 */
  categoryKeyword: string | null;
  locationName: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventLocation {
  locationName: string;
  locationAddress: string | null;
  latitude: number;
  longitude: number;
}

export interface EventInput {
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  color: string;
  /** null이면 자동 분류 */
  category: string | null;
  locationName: string | null;
  locationAddress: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Category {
  code: string;
  name: string;
  recommendable: boolean;
}

export interface Place {
  id: string;
  name: string;
  categoryName: string;
  categoryCode: string | null;
  phone: string | null;
  address: string;
  roadAddress: string | null;
  longitude: number;
  latitude: number;
  url: string;
  distance: number | null;
}

export interface Recommendations {
  event: CalendarEvent;
  radius: number;
  /** keyword: 분류 키워드로 장소 검색(예: 주변 '카페') / category: 카테고리로 장소 검색 */
  mode: 'keyword' | 'category' | 'none';
  query: string | null;
  places: Place[];
  reason: 'unclassified' | 'not-recommendable' | 'no-location' | null;
}
