import type { CalendarEvent, Category, EventInput, Place, Recommendations } from '../types';

const BASE = '/api/events';

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    let message = `요청 실패 (${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join('\n') : body.message ?? message;
    } catch {
      // 응답 본문이 JSON이 아닌 경우 기본 메시지 사용
    }
    throw new Error(message);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const eventsApi = {
  list: (from: string, to: string) =>
    request<CalendarEvent[]>(`${BASE}?from=${from}&to=${to}`),
  create: (input: EventInput) =>
    request<CalendarEvent>(BASE, { method: 'POST', body: JSON.stringify(input) }),
  update: (id: number, input: Partial<EventInput>) =>
    request<CalendarEvent>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  remove: (id: number) => request<void>(`${BASE}/${id}`, { method: 'DELETE' }),
  recommendations: (id: number, radius?: number) =>
    request<Recommendations>(`${BASE}/${id}/recommendations${radius ? `?radius=${radius}` : ''}`),
};

export const placesApi = {
  search: (query: string) =>
    request<Place[]>(`/api/places/search?${new URLSearchParams({ query })}`),
};

export const categoriesApi = {
  list: () => request<Category[]>('/api/categories'),
};
