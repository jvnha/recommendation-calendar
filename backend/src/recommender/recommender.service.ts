import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Category, Classification, NearbyPlaces, Place } from './recommender.types';

/** Python recommender 서비스 HTTP 클라이언트 */
@Injectable()
export class RecommenderService {
  private readonly logger = new Logger(RecommenderService.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config.get<string>('RECOMMENDER_URL', 'http://localhost:8000');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (e) {
      throw new ServiceUnavailableException(`추천 서비스에 연결할 수 없습니다: ${(e as Error).message}`);
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const detail = typeof body.detail === 'string' ? body.detail : `추천 서비스 오류 (${res.status})`;
      throw new HttpException(detail, res.status >= 500 ? res.status : 502);
    }
    return res.json() as Promise<T>;
  }

  /** 분류 실패는 일정 저장을 막지 않도록 null 반환 */
  async classify(title: string, description: string | null): Promise<Classification | null> {
    try {
      return await this.request<Classification>('/classify', {
        method: 'POST',
        body: JSON.stringify({ title, description }),
      });
    } catch (e) {
      this.logger.warn(`일정 분류 실패: ${(e as Error).message}`);
      return null;
    }
  }

  categories(): Promise<Category[]> {
    return this.request('/categories');
  }

  searchPlaces(query: string): Promise<Place[]> {
    return this.request(`/places/search?${new URLSearchParams({ query })}`);
  }

  /** keyword가 장소 키워드면 키워드 검색, 아니면 카테고리 검색 (판단은 recommender 서비스가 함) */
  nearbyPlaces(
    category: string,
    keyword: string | null,
    longitude: number,
    latitude: number,
    radius: number,
  ): Promise<NearbyPlaces> {
    const params = new URLSearchParams({
      category,
      longitude: String(longitude),
      latitude: String(latitude),
      radius: String(radius),
    });
    if (keyword) params.set('keyword', keyword);
    return this.request(`/places/nearby?${params}`);
  }
}
