import type { CalendarEvent } from '../types';
import { formatTime, toDateKey } from '../utils/date';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MAX_VISIBLE = 3;

interface Props {
  month: Date;
  days: Date[];
  eventsByDate: Map<string, CalendarEvent[]>;
  onSelectDate: (dateKey: string) => void;
  onSelectEvent: (dateKey: string, eventId: number) => void;
}

export default function CalendarGrid({
  month,
  days,
  eventsByDate,
  onSelectDate,
  onSelectEvent,
}: Props) {
  const todayKey = toDateKey(new Date());

  return (
    <div className="calendar">
      {WEEKDAYS.map((w, i) => (
        <div key={w} className={`weekday ${i === 0 ? 'sun' : i === 6 ? 'sat' : ''}`}>
          {w}
        </div>
      ))}

      {days.map((day) => {
        const key = toDateKey(day);
        const dayEvents = eventsByDate.get(key) ?? [];
        const classes = [
          'day',
          day.getMonth() !== month.getMonth() && 'outside',
          key === todayKey && 'today',
          day.getDay() === 0 && 'sun',
          day.getDay() === 6 && 'sat',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button key={key} className={classes} onClick={() => onSelectDate(key)}>
            <span className="day-number">{day.getDate()}</span>
            <ul className="day-events">
              {dayEvents.slice(0, MAX_VISIBLE).map((ev) => (
                <li
                  key={ev.id}
                  className="event-chip"
                  style={{ '--event-color': ev.color } as React.CSSProperties}
                  title={ev.title}
                  onClick={(e) => {
                    // 날짜 칸 클릭(목록 열기) 대신 일정 상세로 이동
                    e.stopPropagation();
                    onSelectEvent(key, ev.id);
                  }}
                >
                  {ev.startTime && <span className="time">{formatTime(ev.startTime)}</span>}
                  {ev.title}
                </li>
              ))}
              {dayEvents.length > MAX_VISIBLE && (
                <li className="more">+{dayEvents.length - MAX_VISIBLE}개 더보기</li>
              )}
            </ul>
          </button>
        );
      })}
    </div>
  );
}
