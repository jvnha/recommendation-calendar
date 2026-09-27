"""카카오 로컬 API 클라이언트 (REST API 키 필요)

- 키워드 검색: 일정 위치 입력 모달에서 장소 검색
- 키워드 + 카테고리 필터 검색: 분류 키워드가 장소 이름일 때 주변 장소 추천 (예: 주변 '스타벅스')
- 카테고리 검색: 그 외 일정 위치 주변의 같은 카테고리 장소 추천
"""

from __future__ import annotations

import httpx
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

BASE_URL = "https://dapi.kakao.com/v2/local/search"


class KakaoApiError(Exception):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code


class Place(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    name: str
    category_name: str
    category_code: str | None
    phone: str | None
    address: str
    road_address: str | None
    longitude: float
    latitude: float
    url: str
    distance: int | None  # 기준 좌표로부터의 거리(m). 기준 좌표를 주지 않으면 None

    @classmethod
    def from_kakao(cls, doc: dict) -> Place:
        return cls(
            id=doc["id"],
            name=doc["place_name"],
            category_name=doc.get("category_name", ""),
            category_code=doc.get("category_group_code") or None,
            phone=doc.get("phone") or None,
            address=doc.get("address_name", ""),
            road_address=doc.get("road_address_name") or None,
            longitude=float(doc["x"]),
            latitude=float(doc["y"]),
            url=doc.get("place_url", ""),
            distance=int(doc["distance"]) if doc.get("distance") else None,
        )


class KakaoLocalClient:
    def __init__(self, rest_api_key: str | None, timeout: float = 5.0):
        self._key = rest_api_key
        self._client = httpx.AsyncClient(base_url=BASE_URL, timeout=timeout)

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _get(self, path: str, params: dict) -> list[Place]:
        if not self._key:
            raise KakaoApiError(503, "KAKAO_REST_API_KEY가 설정되지 않았습니다.")
        try:
            res = await self._client.get(
                path,
                params={k: v for k, v in params.items() if v is not None},
                headers={"Authorization": f"KakaoAK {self._key}"},
            )
        except httpx.HTTPError as e:
            raise KakaoApiError(502, f"카카오 API 호출 실패: {e}") from e
        if res.status_code != 200:
            try:
                detail = res.json().get("message", res.text)
            except ValueError:
                detail = res.text
            raise KakaoApiError(502, f"카카오 API 오류 ({res.status_code}): {detail}")
        return [Place.from_kakao(doc) for doc in res.json().get("documents", [])]

    async def search_keyword(
        self,
        query: str,
        *,
        longitude: float | None = None,
        latitude: float | None = None,
        category_code: str | None = None,
        radius: int | None = None,
        size: int = 15,
    ) -> list[Place]:
        """장소명/주소 키워드 검색.
        좌표를 주면 거리 정보가 포함되고, radius까지 주면 반경 내 결과만 거리순으로 조회한다."""
        return await self._get(
            "/keyword.json",
            {
                "query": query,
                "category_group_code": category_code,
                "x": longitude,
                "y": latitude,
                "radius": radius,
                "sort": "distance" if radius is not None else None,
                "size": size,
            },
        )

    async def search_category(
        self, category_code: str, *, longitude: float, latitude: float, radius: int = 1000, size: int = 15
    ) -> list[Place]:
        """좌표 기준 반경 내 카테고리 장소를 거리순으로 조회"""
        return await self._get(
            "/category.json",
            {
                "category_group_code": category_code,
                "x": longitude,
                "y": latitude,
                "radius": radius,
                "size": size,
                "sort": "distance",
            },
        )
