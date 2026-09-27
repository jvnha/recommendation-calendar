"""일정 분류 · 장소 추천 API (FastAPI)

실행: uvicorn app.main:app --reload --port 8000
"""

from __future__ import annotations

import os
from contextlib import asynccontextmanager
from typing import Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from .categories import CATEGORIES, CATEGORY_BY_CODE, search_keyword_for
from .classifier import EventClassifier, build_scorer
from .kakao import KakaoApiError, KakaoLocalClient, Place

load_dotenv()

# 유사도 점수는 방식마다 분포가 달라 임계값도 따로 둔다 (SIMILARITY_THRESHOLD로 덮어쓰기 가능)
DEFAULT_THRESHOLDS = {"embedding": 0.45, "char-ngram": 0.2}


@asynccontextmanager
async def lifespan(app: FastAPI):
    scorer = build_scorer(
        os.getenv("SIMILARITY_BACKEND", "auto"),
        os.getenv("EMBEDDING_MODEL", "jhgan/ko-sroberta-multitask"),
    )
    threshold = float(os.getenv("SIMILARITY_THRESHOLD") or DEFAULT_THRESHOLDS[scorer.name])
    app.state.classifier = EventClassifier(scorer, threshold)
    app.state.kakao = KakaoLocalClient(os.getenv("KAKAO_REST_API_KEY"))
    yield
    await app.state.kakao.aclose()


app = FastAPI(title="Calendar Recommender", lifespan=lifespan)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class CategoryOut(CamelModel):
    code: str
    name: str
    recommendable: bool


class ClassifyIn(CamelModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = None


class ClassifyOut(CamelModel):
    code: str
    name: str
    method: str
    score: float
    matched_keyword: str | None
    scores: dict[str, float]


class NearbyOut(CamelModel):
    # keyword: 분류 키워드로 '키워드로 장소 검색' / category: '카테고리로 장소 검색' / none: 추천 대상 아님
    mode: Literal["keyword", "category", "none"]
    query: str | None
    places: list[Place]


def _kakao_error(e: KakaoApiError) -> HTTPException:
    return HTTPException(status_code=e.status_code, detail=str(e))


@app.get("/health")
def health():
    classifier: EventClassifier = app.state.classifier
    return {"status": "ok", "similarity": classifier.scorer_name, "threshold": classifier.threshold}


@app.get("/categories", response_model=list[CategoryOut])
def list_categories():
    return [CategoryOut(code=c.code, name=c.name, recommendable=c.recommendable) for c in CATEGORIES]


@app.post("/classify", response_model=ClassifyOut)
def classify(body: ClassifyIn):
    result = app.state.classifier.classify(body.title, body.description)
    return ClassifyOut(**result.__dict__)


@app.get("/places/search", response_model=list[Place])
async def search_places(
    query: str = Query(min_length=1, max_length=100),
    longitude: float | None = None,
    latitude: float | None = None,
):
    try:
        return await app.state.kakao.search_keyword(query, longitude=longitude, latitude=latitude)
    except KakaoApiError as e:
        raise _kakao_error(e)


@app.get("/places/nearby", response_model=NearbyOut)
async def nearby_places(
    category: str,
    longitude: float = Query(ge=-180, le=180),
    latitude: float = Query(ge=-90, le=90),
    keyword: str | None = Query(None, description="분류 시 매칭된 키워드 (classify의 matchedKeyword)"),
    radius: int = Query(1000, ge=1, le=20000),
    size: int = Query(15, ge=1, le=15),
):
    """일정 위치 주변의 추천 장소.
    매칭 키워드가 장소 키워드(카페, 치과 등)면 '키워드로 장소 검색'에 카테고리 필터를 걸어 조회하고,
    그 외(행동 키워드·유사도 분류·수동 지정)나 키워드 검색 결과가 없으면 '카테고리로 장소 검색'을 쓴다."""
    target = CATEGORY_BY_CODE.get(category)
    if target is None:
        raise HTTPException(status_code=400, detail=f"알 수 없는 카테고리: {category}")
    if not target.recommendable:
        return NearbyOut(mode="none", query=None, places=[])

    kakao: KakaoLocalClient = app.state.kakao
    coords = {"longitude": longitude, "latitude": latitude, "radius": radius, "size": size}
    try:
        query = search_keyword_for(category, keyword)
        if query:
            places = await kakao.search_keyword(query, category_code=category, **coords)
            if places:
                return NearbyOut(mode="keyword", query=query, places=places)
        places = await kakao.search_category(category, **coords)
        return NearbyOut(mode="category", query=None, places=places)
    except KakaoApiError as e:
        raise _kakao_error(e)
