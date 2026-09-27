/** Python recommender 서비스(recommender/app/main.py) 응답 타입 */

export type ClassificationMethod = 'keyword' | 'similarity' | 'fallback' | 'manual';

export interface Classification {
  code: string;
  name: string;
  method: Exclude<ClassificationMethod, 'manual'>;
  score: number;
  matchedKeyword: string | null;
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

export interface NearbyPlaces {
  /** keyword: 키워드로 장소 검색 / category: 카테고리로 장소 검색 / none: 추천 대상 아님 */
  mode: 'keyword' | 'category' | 'none';
  /** mode가 keyword일 때 사용한 검색어 */
  query: string | null;
  places: Place[];
}

/** 카카오 category_group_code + 기타 */
export const CATEGORY_CODES = [
  'MT1', 'CS2', 'PS3', 'SC4', 'AC5', 'PK6', 'OL7', 'SW8', 'BK9',
  'CT1', 'AG2', 'PO3', 'AT4', 'AD5', 'FD6', 'CE7', 'HP8', 'PM9', 'ETC',
] as const;
