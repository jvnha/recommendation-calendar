import { useEffect, useState } from 'react';
import { eventsApi } from '../api/events';
import type { CalendarEvent, Category, EventInput } from '../types';
import { formatKoreanDate, formatTime } from '../utils/date';
import EventDetail from './EventDetail';
import EventForm from './EventForm';

interface Props {
  date: string;
  events: CalendarEvent[];
  categories: Map<string, Category>;
  /** 캘린더에서 일정을 직접 클릭한 경우 해당 일정 상세부터 표시 */
  initialEventId?: number;
  onClose: () => void;
  onChanged: () => Promise<void>;
}

type View =
  | { mode: 'list' }
  | { mode: 'create' }
  | { mode: 'detail'; id: number }
  | { mode: 'edit'; id: number };

export default function EventModal({
  date,
  events,
  categories,
  initialEventId,
  onClose,
  onChanged,
}: Props) {
  const [view, setView] = useState<View>(() =>
    initialEventId != null
      ? { mode: 'detail', id: initialEventId }
      : events.length
        ? { mode: 'list' }
        : { mode: 'create' },
  );
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const target = 'id' in view ? events.find((ev) => ev.id === view.id) : undefined;

  // 상세/수정 중인 일정이 목록에서 사라지면(삭제 등) 목록으로
  useEffect(() => {
    if ('id' in view && !target) setView({ mode: 'list' });
  }, [view, target]);

  const run = async (action: () => Promise<CalendarEvent | void>) => {
    setBusy(true);
    setError(null);
    try {
      const saved = await action();
      await onChanged();
      // 저장 후에는 분류 결과와 추천 장소를 바로 확인할 수 있도록 상세 화면으로
      setView(saved ? { mode: 'detail', id: saved.id } : { mode: 'list' });
      setPendingDeleteId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (input: EventInput) =>
    run(() =>
      view.mode === 'edit' ? eventsApi.update(view.id, input) : eventsApi.create(input),
    );

  const timeLabel = (ev: CalendarEvent) => {
    if (!ev.startTime) return '종일';
    const end = ev.endTime ? ` – ${formatTime(ev.endTime)}` : '';
    return `${formatTime(ev.startTime)}${end}`;
  };

  const backToList = () => (events.length ? setView({ mode: 'list' }) : onClose());

  let body: React.ReactNode;
  if (view.mode === 'list') {
    body = (
      <>
        {events.length === 0 ? (
          <p className="empty">등록된 일정이 없습니다.</p>
        ) : (
          <ul className="event-list">
            {events.map((ev) => (
              <li key={ev.id} style={{ '--event-color': ev.color } as React.CSSProperties}>
                <button
                  className="event-info"
                  onClick={() => setView({ mode: 'detail', id: ev.id })}
                >
                  <strong>{ev.title}</strong>
                  <span className="event-time">
                    {timeLabel(ev)}
                    {ev.category && ` · ${categories.get(ev.category)?.name ?? ev.category}`}
                    {ev.locationName && ` · ${ev.locationName}`}
                  </span>
                </button>
                <div className="event-actions">
                  {pendingDeleteId === ev.id ? (
                    <>
                      <button
                        className="danger"
                        disabled={busy}
                        onClick={() => run(() => eventsApi.remove(ev.id))}
                      >
                        삭제 확인
                      </button>
                      <button disabled={busy} onClick={() => setPendingDeleteId(null)}>
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setView({ mode: 'edit', id: ev.id })}>수정</button>
                      <button className="danger" onClick={() => setPendingDeleteId(ev.id)}>
                        삭제
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <footer className="modal-footer">
          <button className="primary" onClick={() => setView({ mode: 'create' })}>
            + 새 일정
          </button>
        </footer>
      </>
    );
  } else if (view.mode === 'detail') {
    body = target && (
      <EventDetail
        event={target}
        categories={categories}
        onEdit={() => setView({ mode: 'edit', id: target.id })}
        onBack={() => setView({ mode: 'list' })}
      />
    );
  } else {
    body = (view.mode === 'create' || target) && (
      <EventForm
        key={target?.id ?? 'new'}
        date={date}
        initial={target}
        categories={categories}
        busy={busy}
        onSubmit={handleSubmit}
        onCancel={() => (target ? setView({ mode: 'detail', id: target.id }) : backToList())}
      />
    );
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-header">
          <h2 id="modal-title">{formatKoreanDate(date)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        {error && <div className="error-banner">{error}</div>}

        {body}
      </div>
    </div>
  );
}
