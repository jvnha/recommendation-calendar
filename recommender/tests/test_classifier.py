import pytest

from app.categories import CATEGORIES, ETC_CODE
from app.classifier import CharNgramScorer, EventClassifier, KeywordMatcher


@pytest.fixture(scope="module")
def classifier():
    return EventClassifier(CharNgramScorer(CATEGORIES), threshold=0.2)


@pytest.mark.parametrize(
    "title, code, keyword",
    [
        ("팀 회식", "FD6", "회식"),
        ("스타벅스에서 스터디", "CE7", "스타벅스"),
        ("치과 예약", "HP8", "치과"),
        ("강남역 3번 출구에서 만나기", "SW8", "번출구"),
        ("약 타기", "PM9", "약타기"),  # 띄어쓰기 무시
        ("CU 알바", "CS2", "cu"),  # 대소문자 무시
        ("과제 제출", ETC_CODE, "제출"),
    ],
)
def test_keyword_match(classifier, title, code, keyword):
    result = classifier.classify(title)
    assert (result.code, result.method, result.matched_keyword) == (code, "keyword", keyword)


def test_longest_keyword_wins():
    # '이마트'(대형마트)와 '이마트24'(편의점) 둘 다 포함 → 더 구체적인 쪽
    assert KeywordMatcher(CATEGORIES).match("이마트24 들르기").code == "CS2"
    # '강의'(학교)보다 긴 '온라인'(기타)
    assert KeywordMatcher(CATEGORIES).match("온라인 강의").code == ETC_CODE


def test_title_keyword_has_priority_over_description(classifier):
    result = classifier.classify("팀 회식", "카페에서 2차")
    assert result.code == "FD6"


def test_description_keyword_used_when_title_has_none(classifier):
    result = classifier.classify("민수 만나기", "학교 앞 카페")
    assert result.method == "keyword"


@pytest.mark.parametrize("title", ["cute 선물 사기", "스마트폰 수리", "1주차 과제", "드라마 시청"])
def test_no_false_keyword_match(title):
    assert KeywordMatcher(CATEGORIES).match(title) is None


@pytest.mark.parametrize(
    "title, code",
    [("친구랑 밥 먹기", "FD6"), ("고기 먹으러", "FD6"), ("감기약 사기", "PM9"), ("벚꽃 구경", "AT4"), ("마트 가기", "MT1")],
)
def test_similarity(classifier, title, code):
    result = classifier.classify(title)
    assert (result.code, result.method) == (code, "similarity")
    assert set(result.scores) == {c.code for c in CATEGORIES}


@pytest.mark.parametrize("title", ["면접", "헬스장", "cute 선물 사기"])
def test_low_similarity_falls_back_to_etc(classifier, title):
    result = classifier.classify(title)
    assert (result.code, result.method) == (ETC_CODE, "fallback")
    assert result.score < classifier.threshold
