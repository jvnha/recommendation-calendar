import { useState, type KeyboardEvent } from 'react';
import { placesApi } from '../api/events';
import type { EventLocation, Place } from '../types';

interface Props {
  value: EventLocation | null;
  onChange: (location: EventLocation | null) => void;
}

/** 카카오 장소 검색으로 일정 위치 지정 */
export default function LocationPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await placesApi.search(q));
    } catch (e) {
      setError((e as Error).message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  // 폼 안에 있으므로 Enter가 일정 저장(submit)으로 이어지지 않게 막는다
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
      e.preventDefault();
      search();
    }
  };

  const select = (place: Place) => {
    onChange({
      locationName: place.name,
      locationAddress: place.roadAddress || place.address || null,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setResults(null);
    setQuery('');
  };

  return (
    <div className="location-picker">
      <span className="field-label">장소</span>

      {value ? (
        <div className="location-selected">
          <div>
            <strong>{value.locationName}</strong>
            {value.locationAddress && <span className="muted small">{value.locationAddress}</span>}
          </div>
          <button type="button" onClick={() => onChange(null)}>
            지우기
          </button>
        </div>
      ) : (
        <>
          <div className="location-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="장소 또는 주소 검색 (선택)"
              aria-label="장소 검색"
            />
            <button type="button" onClick={search} disabled={searching || !query.trim()}>
              {searching ? '검색 중…' : '검색'}
            </button>
          </div>
          {error && <p className="field-error">{error}</p>}
          {results &&
            (results.length === 0 ? (
              <p className="muted small">검색 결과가 없습니다.</p>
            ) : (
              <ul className="place-results">
                {results.map((p) => (
                  <li key={p.id}>
                    <button type="button" onClick={() => select(p)}>
                      <strong>{p.name}</strong>
                      <span className="muted small">{p.roadAddress || p.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ))}
        </>
      )}
    </div>
  );
}
