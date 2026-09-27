import pytest
from fastapi.testclient import TestClient

from app.kakao import Place
from app.main import app

COORDS = {"longitude": 127.0276, "latitude": 37.4979}


def _place(name: str) -> Place:
    return Place(
        id=name, name=name, category_name="", category_code=None, phone=None, address="",
        road_address=None, longitude=127.0, latitude=37.5, url="", distance=100,
    )


class FakeKakao:
    """호출 기록을 남기고, keyword_results에 따라 키워드 검색 결과를 돌려주는 가짜 클라이언트"""

    def __init__(self, keyword_results: list[Place]):
        self.keyword_results = keyword_results
        self.calls: list[tuple] = []

    async def search_keyword(self, query, **kwargs):
        self.calls.append(("keyword", query, kwargs.get("category_code")))
        return self.keyword_results

    async def search_category(self, category_code, **kwargs):
        self.calls.append(("category", category_code))
        return [_place("카테고리 결과")]

    async def aclose(self):
        pass


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setenv("SIMILARITY_BACKEND", "char-ngram")
    monkeypatch.delenv("KAKAO_REST_API_KEY", raising=False)
    with TestClient(app) as c:
        yield c


def test_classify_and_categories(client):
    categories = client.get("/categories").json()
    assert len(categories) == 19 and categories[-1] == {"code": "ETC", "name": "기타", "recommendable": False}

    body = client.post("/classify", json={"title": "팀 회식"}).json()
    assert body["code"] == "FD6" and body["matchedKeyword"] == "회식"

    # 키 미설정
    assert client.get("/places/search", params={"query": "강남역"}).status_code == 503


def test_nearby_etc_is_not_recommended(client):
    body = client.get("/places/nearby", params={"category": "ETC", **COORDS}).json()
    assert body == {"mode": "none", "query": None, "places": []}


def test_nearby_uses_keyword_search_for_place_keyword(client):
    app.state.kakao = fake = FakeKakao([_place("스타벅스 강남점")])
    body = client.get("/places/nearby", params={"category": "CE7", "keyword": "스타벅스", **COORDS}).json()
    assert (body["mode"], body["query"], body["places"][0]["name"]) == ("keyword", "스타벅스", "스타벅스 강남점")
    assert fake.calls == [("keyword", "스타벅스", "CE7")]


def test_nearby_falls_back_to_category_when_keyword_has_no_results(client):
    app.state.kakao = fake = FakeKakao([])
    body = client.get("/places/nearby", params={"category": "CE7", "keyword": "스타벅스", **COORDS}).json()
    assert body["mode"] == "category"
    assert fake.calls == [("keyword", "스타벅스", "CE7"), ("category", "CE7")]


@pytest.mark.parametrize(
    "params",
    [
        {"category": "FD6", "keyword": "회식"},  # 행동 키워드
        {"category": "FD6"},  # 유사도 분류 / 수동 지정
        {"category": "FD6", "keyword": "스타벅스"},  # 다른 카테고리의 키워드
    ],
)
def test_nearby_uses_category_search_otherwise(client, params):
    app.state.kakao = fake = FakeKakao([_place("x")])
    body = client.get("/places/nearby", params={**params, **COORDS}).json()
    assert body["mode"] == "category"
    assert fake.calls == [("category", "FD6")]
