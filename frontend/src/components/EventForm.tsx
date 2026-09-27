import { useState, type FormEvent } from 'react';
import type { CalendarEvent, Category, EventInput, EventLocation } from '../types';
import { formatTime } from '../utils/date';
import LocationPicker from './LocationPicker';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];

interface Props {
  date: string;
  initial?: CalendarEvent;
  categories: Map<string, Category>;
  busy: boolean;
  onSubmit: (input: EventInput) => void;
  onCancel: () => void;
}

export default function EventForm({ date, initial, categories, busy, onSubmit, onCancel }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [allDay, setAllDay] = useState(initial ? !initial.startTime : true);
  const [startTime, setStartTime] = useState(formatTime(initial?.startTime ?? null) || '09:00');
  const [endTime, setEndTime] = useState(formatTime(initial?.endTime ?? null) || '10:00');
  const [color, setColor] = useState(initial?.color ?? COLORS[0]);
  const [location, setLocation] = useState<EventLocation | null>(() =>
    initial?.locationName && initial.latitude != null && initial.longitude != null
      ? {
          locationName: initial.locationName,
          locationAddress: initial.locationAddress,
          latitude: initial.latitude,
          longitude: initial.longitude,
        }
      : null,
  );
  /** '' = 자동 분류 */
  const [category, setCategory] = useState(
    initial?.categoryMethod === 'manual' ? (initial.category ?? '') : '',
  );

  const timeInvalid = !allDay && !!startTime && !!endTime && startTime > endTime;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || timeInvalid) return;
    onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      date: initial?.date ?? date,
      startTime: allDay ? null : startTime || null,
      endTime: allDay ? null : endTime || null,
      color,
      category: category || null,
      locationName: location?.locationName ?? null,
      locationAddress: location?.locationAddress ?? null,
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
    });
  };

  return (
    <form className="event-form" onSubmit={handleSubmit}>
      <label>
        제목
        <input
          autoFocus
          required
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="일정 제목"
        />
      </label>

      <label className="checkbox">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
        종일
      </label>

      {!allDay && (
        <div className="time-row">
          <label>
            시작
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </label>
          <label>
            종료
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </label>
        </div>
      )}
      {timeInvalid && <p className="field-error">종료 시간은 시작 시간 이후여야 합니다.</p>}

      <LocationPicker value={location} onChange={setLocation} />

      <label>
        카테고리
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">자동 분류 (제목·메모 기준)</option>
          {[...categories.values()].map((c) => (
            <option key={c.code} value={c.code}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="colors">
        <legend>색상</legend>
        {COLORS.map((c) => (
          <button
            type="button"
            key={c}
            className={`swatch ${c === color ? 'selected' : ''}`}
            style={{ background: c }}
            onClick={() => setColor(c)}
            aria-label={`색상 ${c}`}
            aria-pressed={c === color}
          />
        ))}
      </fieldset>

      <label>
        메모
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="설명 (선택)"
        />
      </label>

      <footer className="modal-footer">
        <button type="button" onClick={onCancel} disabled={busy}>
          취소
        </button>
        <button type="submit" className="primary" disabled={busy || !title.trim() || timeInvalid}>
          {initial ? '저장' : '추가'}
        </button>
      </footer>
    </form>
  );
}
