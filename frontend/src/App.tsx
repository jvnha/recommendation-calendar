import { useCallback, useEffect, useMemo, useState } from 'react';
import { categoriesApi, eventsApi } from './api/events';
import CalendarGrid from './components/CalendarGrid';
import EventModal from './components/EventModal';
import type { CalendarEvent, Category } from './types';
import { addMonths, getMonthGrid, startOfMonth, toDateKey } from './utils/date';

export default function App() {
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ date: string; eventId?: number } | null>(null);
  const [categories, setCategories] = useState<Map<string, Category>>(new Map());

  useEffect(() => {
    // 분류 서비스가 꺼져 있어도 캘린더는 동작하도록 실패는 무시 (카테고리는 코드로 표시됨)
    categoriesApi
      .list()
      .then((list) => setCategories(new Map(list.map((c) => [c.code, c]))))
      .catch(() => {});
  }, []);

  const days = useMemo(() => getMonthGrid(month), [month]);
  const from = toDateKey(days[0]);
  const to = toDateKey(days[days.length - 1]);

  const loadEvents = useCallback(async () => {
    try {
      setEvents(await eventsApi.list(from, to));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [from, to]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  return (
    <div className="app">
      <header className="header">
        <h1>
          {month.getFullYear()}년 {month.getMonth() + 1}월
        </h1>
        <div className="nav">
          <button onClick={() => setMonth((m) => addMonths(m, -1))} aria-label="이전 달">
            ‹
          </button>
          <button onClick={() => setMonth(startOfMonth(new Date()))}>오늘</button>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} aria-label="다음 달">
            ›
          </button>
        </div>
      </header>

      {error && <div className="error-banner">일정을 불러오지 못했습니다: {error}</div>}

      <CalendarGrid
        month={month}
        days={days}
        eventsByDate={eventsByDate}
        onSelectDate={(date) => setSelected({ date })}
        onSelectEvent={(date, eventId) => setSelected({ date, eventId })}
      />

      {selected && (
        <EventModal
          key={`${selected.date}-${selected.eventId ?? ''}`}
          date={selected.date}
          initialEventId={selected.eventId}
          events={eventsByDate.get(selected.date) ?? []}
          categories={categories}
          onClose={() => setSelected(null)}
          onChanged={loadEvents}
        />
      )}
    </div>
  );
}
