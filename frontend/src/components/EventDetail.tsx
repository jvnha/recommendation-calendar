import { useEffect, useState } from 'react';
import { eventsApi } from '../api/events';
import type { CalendarEvent, Category, Recommendations } from '../types';
import { formatTime } from '../utils/date';

const RADIUS_OPTIONS = [500, 1000, 2000, 5000];

interface Props {
  event: CalendarEvent;
  categories: Map<string, Category>;
  onEdit: () => void;
  onBack?: () => void;
}

function formatDistance(m: number | null) {
  if (m == null) return '';
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function methodLabel(ev: CalendarEvent) {
  switch (ev.categoryMethod) {
    case 'manual':
      return '직접 지정';
    case 'keyword':
      return ev.categoryKeyword ? `키워드 '${ev.categoryKeyword}' 일치` : '키워드 일치';
    case 'similarity':
      return `유사도 ${(ev.categoryScore ?? 0).toFixed(2)}`;
    case 'fallback':
      return '유사한 카테고리 없음';
    default:
      return '';
  }
}

const REASON_MESSAGES: Record<NonNullable<Recommendations['reason']>, string> = {
  unclassified: '카테고리 분류 서비스에 연결할 수 없어 추천을 표시할 수 없습니다.',
  'not-recommendable': '장소 추천이 필요하지 않은 일정입니다.',
  'no-location': '일정에 장소를 지정하면 주변 장소를 추천해 드려요.',
};

export default function EventDetail({ event, categories, onEdit, onBack }: Props) {
  const [radius, setRadius] = useState(1000);
  const [rec, setRec] = useState<Recommendations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // updatedAt: 일정 수정(제목·장소 변경) 후 다시 조회
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    eventsApi
      .recommendations(event.id, radius)
      .then((r) => {
        if (!cancelled) setRec(r);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event.id, event.updatedAt, radius]);

  // 조회 시점에 지연 분류됐을 수 있으므로 추천 응답의 일정 정보를 우선 사용
  const current = rec?.event.id === event.id ? rec.event : event;
  const category = current.category ? categories.get(current.category) : undefined;
  const categoryName = category?.name ?? current.category ?? '미분류';
  const recTitle =
    rec?.mode === 'keyword'
      ? `주변 '${rec.query}' 추천`
      : category?.recommendable
        ? `주변 ${category.name} 추천`
        : '주변 장소 추천';

  const time = event.startTime
    ? `${formatTime(event.startTime)}${event.endTime ? ` – ${formatTime(event.endTime)}` : ''}`
    : '종일';

  return (
    <div className="event-detail">
      <div className="detail-head" style={{ '--event-color': event.color } as React.CSSProperties}>
        <h3>{event.title}</h3>
        <span className="event-time">{time}</span>
      </div>

      <dl className="detail-fields">
        <dt>카테고리</dt>
        <dd>
          <span className={`category-badge ${current.category === 'ETC' ? 'etc' : ''}`}>
            {categoryName}
          </span>
          {current.categoryMethod && <span className="muted small">{methodLabel(current)}</span>}
        </dd>

        <dt>장소</dt>
        <dd>
          {event.locationName ? (
            <div>
              <div>{event.locationName}</div>
              {event.locationAddress && <div className="muted small">{event.locationAddress}</div>}
            </div>
          ) : (
            <span className="muted">지정 안 함</span>
          )}
        </dd>

        {event.description && (
          <>
            <dt>메모</dt>
            <dd className="event-desc">{event.description}</dd>
          </>
        )}
      </dl>

      <section className="recommendations">
        <div className="rec-header">
          <h4>{recTitle}</h4>
          {rec && !rec.reason && (
            <select
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="검색 반경"
            >
              {RADIUS_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  반경 {formatDistance(r)}
                </option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <p className="muted small">불러오는 중…</p>
        ) : error ? (
          <div className="error-banner">{error}</div>
        ) : rec?.reason ? (
          <p className="muted small">{REASON_MESSAGES[rec.reason]}</p>
        ) : rec && rec.places.length === 0 ? (
          <p className="muted small">
            반경 {formatDistance(radius)} 안에 {categoryName} 장소가 없습니다.
          </p>
        ) : (
          <ul className="place-list">
            {rec?.places.map((p) => (
              <li key={p.id}>
                <div className="place-main">
                  <a href={p.url} target="_blank" rel="noreferrer">
                    {p.name}
                  </a>
                  <span className="place-distance">{formatDistance(p.distance)}</span>
                </div>
                <div className="muted small">
                  {p.categoryName.split(' > ').pop()} · {p.roadAddress || p.address}
                  {p.phone && ` · ${p.phone}`}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="modal-footer">
        {onBack && (
          <button type="button" onClick={onBack}>
            목록
          </button>
        )}
        <button type="button" className="primary" onClick={onEdit}>
          수정
        </button>
      </footer>
    </div>
  );
}
