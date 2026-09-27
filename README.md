# 캘린더 웹서비스

- **Frontend**: React + TypeScript + Vite (`frontend/`)
- **Backend**: NestJS + TypeORM (`backend/`)
- **DB**: PostgreSQL 16 (`docker-compose.yml`)
- **Recommender**: Python + FastAPI (`recommender/`) — 일정 카테고리 분류, 카카오 로컬 API 장소 검색/추천

## 실행 방법

```bash
# 1. DB 실행 (Docker Desktop 필요)
docker compose up -d

# 2. 백엔드 (http://localhost:3000/api)
cd backend
cp .env.example .env   # 최초 1회
npm install
npm run start:dev

# 3. 분류·추천 서비스 (http://localhost:8000)
cd recommender
python -m venv .venv
.venv\Scripts\activate          # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt   # 의미 기반 유사도까지 쓰려면 requirements-embedding.txt
cp .env.example .env              # KAKAO_REST_API_KEY 입력
uvicorn app.main:app --reload --port 8000

# 4. 프론트엔드 (http://localhost:5173)
cd frontend
npm install
npm run dev
```

개발 환경에서는 TypeORM `synchronize`가 켜져 있어 `events` 테이블이 자동 생성됩니다.
(`NODE_ENV=production`이면 꺼지므로 운영 시에는 migration을 사용하세요.)

## API

| Method | Path | 설명 |
|---|---|---|
| GET | `/api/events?from=YYYY-MM-DD&to=YYYY-MM-DD` | 기간 내 일정 목록 |
| GET | `/api/events/:id` | 일정 단건 조회 |
| POST | `/api/events` | 일정 생성 |
| PATCH | `/api/events/:id` | 일정 수정 |
| DELETE | `/api/events/:id` | 일정 삭제 |
| GET | `/api/events/:id/recommendations?radius=1000` | 일정 카테고리와 같은 주변 장소 (거리순) |
| GET | `/api/places/search?query=강남역` | 일정 위치 입력용 장소 검색 |
| GET | `/api/categories` | 카테고리 목록 |

요청 본문 예시:

```json
{
  "title": "팀 회의",
  "date": "2026-09-01",
  "startTime": "10:00",
  "endTime": "11:00",
  "description": "회의실 A",
  "color": "#3b82f6",
  "category": null,
  "locationName": "강남역 2호선",
  "locationAddress": "서울 강남구 강남대로 396",
  "latitude": 37.49796,
  "longitude": 127.02763
}
```

`startTime`/`endTime`을 생략하거나 `null`로 보내면 종일 일정입니다.

`category`를 생략하거나 `null`로 보내면 제목/메모로 자동 분류하고, 코드를 지정하면 그 값으로 고정합니다(`categoryMethod: "manual"`).
자동 분류된 일정은 제목이나 메모가 바뀌면 다시 분류됩니다.

## 일정 카테고리 분류

카테고리는 [카카오 로컬 API의 카테고리 그룹 코드](https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category) 18종 + `ETC`(기타)입니다.
정의와 키워드/예시 문장은 `recommender/app/categories.py`에 있습니다.

1. **키워드 매칭**: 제목 → 메모 순으로 카테고리 키워드 포함 여부를 확인합니다(공백·대소문자 무시).
   여러 개가 걸리면 가장 긴 키워드를 택합니다. 예) `이마트24` → 편의점(`이마트`보다 구체적)
2. **유사도 점수**: 키워드가 없으면 각 카테고리의 설명·예시 문장과 유사도를 계산해 가장 높은 카테고리를 선택합니다.
   - `sentence-transformers` 설치 시: 한국어 문장 임베딩(`jhgan/ko-sroberta-multitask`) 코사인 유사도
   - 미설치 시: 문자 n-gram TF-IDF 코사인 유사도
3. 최고 점수가 임계값(`SIMILARITY_THRESHOLD`) 미만이면 `기타`로 분류합니다.

### 장소 추천

일정에 위치가 지정되어 있으면 그 주변(기본 반경 1km, 거리순)에서 같은 카테고리의 장소를 추천합니다.

- 분류 때 매칭된 키워드가 **장소 키워드**(`카페`, `치과`, `삼겹살` 등)면 카카오 **키워드로 장소 검색**에 카테고리 필터를 걸어 조회합니다. 예) `카페에서 스터디` → 주변 카페
- **행동 키워드**(`회식`, `진료` 등)로 분류됐거나 유사도로 분류됐거나 직접 지정한 경우, 또는 키워드 검색 결과가 없으면 **카테고리로 장소 검색**을 씁니다.
- `기타`는 추천하지 않습니다.

분류 서비스가 꺼져 있어도 일정 저장은 되며(`category: null`), 이후 일정 상세를 열 때 다시 분류를 시도합니다.

```bash
cd recommender && python -m pytest   # 분류기 테스트
```
