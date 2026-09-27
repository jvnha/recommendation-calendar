"""일정 텍스트 → 카테고리 분류기.

1. 키워드 매칭: 제목 → 메모 순으로 카테고리 키워드가 포함되어 있는지 확인한다.
   여러 키워드가 걸리면 가장 긴 키워드(더 구체적인 표현)를, 길이가 같으면 먼저 등장한 키워드를 택한다.
   예) '이마트24' → '이마트'(대형마트)보다 긴 '이마트24'(편의점)
2. 유사도 점수: 키워드가 없으면 각 카테고리의 설명/예시 문장과의 유사도를 계산해 가장 높은 카테고리를 고른다.
3. 가장 높은 점수도 임계값 미만이면 '기타'로 분류한다.
"""

from __future__ import annotations

import logging
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field
from typing import Literal, Protocol

from .categories import CATEGORIES, CATEGORY_BY_CODE, ETC_CODE, Category

logger = logging.getLogger(__name__)

Method = Literal["keyword", "similarity", "fallback"]

_ASCII_WORD = re.compile(r"^[a-z0-9]+$")


def _normalize(text: str) -> str:
    """전각/반각 통일 + 소문자화"""
    return unicodedata.normalize("NFKC", text).lower()


def _compact(text: str) -> str:
    """띄어쓰기가 제각각인 한국어 입력을 위해 공백 제거"""
    return re.sub(r"\s+", "", _normalize(text))


def _category_documents(category: Category) -> list[str]:
    """유사도 비교에 사용할 카테고리 대표 문장들.
    영문 약어 키워드('cu')는 n-gram으로 쪼개면 다른 단어('cute')와 겹치므로 제외한다."""
    keywords = [k for k in category.keywords if not _ASCII_WORD.match(_compact(k))]
    return [f"{category.name} {category.description}", *category.examples, *keywords]


# ---------------------------------------------------------------------------
# 1단계: 키워드 매칭
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class KeywordHit:
    code: str
    keyword: str
    position: int


class KeywordMatcher:
    def __init__(self, categories: list[Category]):
        self._rules: list[tuple[str, str, re.Pattern[str], bool]] = []
        for category in categories:
            for keyword in category.keywords:
                kw = _compact(keyword)
                if _ASCII_WORD.match(kw):
                    # 영문 약어('cu', 'kb')는 다른 영단어 일부('cute')에 걸리지 않도록 경계를 확인
                    pattern = re.compile(rf"(?<![a-z0-9]){re.escape(kw)}(?![a-z0-9])")
                    self._rules.append((category.code, keyword, pattern, False))
                else:
                    self._rules.append((category.code, keyword, re.compile(re.escape(kw)), True))

    def match(self, text: str) -> KeywordHit | None:
        if not text:
            return None
        compact, spaced = _compact(text), _normalize(text)
        best: KeywordHit | None = None
        best_len = 0
        for code, keyword, pattern, use_compact in self._rules:
            m = pattern.search(compact if use_compact else spaced)
            if not m:
                continue
            length = m.end() - m.start()
            if length > best_len or (length == best_len and best and m.start() < best.position):
                best, best_len = KeywordHit(code, keyword, m.start()), length
        return best


# ---------------------------------------------------------------------------
# 2단계: 유사도 점수
# ---------------------------------------------------------------------------


class SimilarityScorer(Protocol):
    name: str

    def scores(self, text: str) -> dict[str, float]:
        """카테고리 코드 → 유사도(0~1)"""
        ...


class CharNgramScorer:
    """문자 n-gram TF-IDF 코사인 유사도. 외부 모델 없이 동작하는 가벼운 기본 구현."""

    name = "char-ngram"

    def __init__(self, categories: list[Category], ngram_range: tuple[int, int] = (2, 3)):
        self._ngram_range = ngram_range
        docs = [(c.code, self._ngrams(d)) for c in categories for d in _category_documents(c)]
        doc_freq = Counter(g for _, grams in docs for g in set(grams))
        n_docs = len(docs)
        self._idf = {g: math.log((1 + n_docs) / (1 + df)) + 1 for g, df in doc_freq.items()}
        self._docs = [(code, self._vectorize(grams)) for code, grams in docs]
        self._codes = [c.code for c in categories]

    def _ngrams(self, text: str) -> Counter[str]:
        s = _compact(text)
        lo, hi = self._ngram_range
        grams: Counter[str] = Counter()
        for n in range(lo, hi + 1):
            grams.update(s[i : i + n] for i in range(len(s) - n + 1))
        if not grams and s:  # 한 글자 입력
            grams[s] += 1
        return grams

    def _vectorize(self, grams: Counter[str]) -> dict[str, float]:
        # 학습 문서에 없는 n-gram은 어차피 내적에 기여하지 않지만 벡터 크기(정규화)에는 반영한다
        default_idf = max(self._idf.values(), default=1.0)
        vec = {g: tf * self._idf.get(g, default_idf) for g, tf in grams.items()}
        norm = math.sqrt(sum(v * v for v in vec.values())) or 1.0
        return {g: v / norm for g, v in vec.items()}

    def scores(self, text: str) -> dict[str, float]:
        query = self._vectorize(self._ngrams(text))
        result = dict.fromkeys(self._codes, 0.0)
        for code, doc in self._docs:
            sim = sum(v * doc.get(g, 0.0) for g, v in query.items())
            result[code] = max(result[code], sim)
        return result


class EmbeddingScorer:
    """sentence-transformers 문장 임베딩 코사인 유사도. 의미가 비슷한 표현(예: '고기 먹기' ≈ '회식')까지 잡는다."""

    name = "embedding"

    def __init__(self, categories: list[Category], model_name: str):
        from sentence_transformers import SentenceTransformer  # 선택 의존성

        self._model = SentenceTransformer(model_name)
        self._codes = [c.code for c in categories]
        self._doc_codes: list[str] = []
        texts: list[str] = []
        for c in categories:
            for d in _category_documents(c):
                self._doc_codes.append(c.code)
                texts.append(d)
        self._doc_emb = self._model.encode(texts, normalize_embeddings=True)

    def scores(self, text: str) -> dict[str, float]:
        query = self._model.encode([text], normalize_embeddings=True)[0]
        sims = self._doc_emb @ query
        result = dict.fromkeys(self._codes, 0.0)
        for code, sim in zip(self._doc_codes, sims):
            result[code] = max(result[code], float(sim))
        return result


def build_scorer(backend: str, model_name: str) -> SimilarityScorer:
    """backend: 'embedding' | 'char-ngram' | 'auto'(임베딩 라이브러리가 설치돼 있으면 임베딩)"""
    if backend in ("embedding", "auto"):
        try:
            return EmbeddingScorer(CATEGORIES, model_name)
        except ImportError:
            if backend == "embedding":
                raise
            logger.info("sentence-transformers가 설치되지 않아 char-ngram 유사도를 사용합니다.")
    return CharNgramScorer(CATEGORIES)


# ---------------------------------------------------------------------------
# 분류기
# ---------------------------------------------------------------------------


@dataclass
class Classification:
    code: str
    name: str
    method: Method
    score: float
    matched_keyword: str | None = None
    scores: dict[str, float] = field(default_factory=dict)


class EventClassifier:
    def __init__(self, scorer: SimilarityScorer, threshold: float):
        self._matcher = KeywordMatcher(CATEGORIES)
        self._scorer = scorer
        self.threshold = threshold

    @property
    def scorer_name(self) -> str:
        return self._scorer.name

    def classify(self, title: str, description: str | None = None) -> Classification:
        description = (description or "").strip()

        # 1) 키워드: 제목이 일정의 핵심이므로 제목을 먼저 보고, 없을 때만 메모를 본다
        hit = self._matcher.match(title) or self._matcher.match(description)
        if hit:
            return self._result(hit.code, "keyword", 1.0, matched_keyword=hit.keyword)

        # 2) 유사도: 메모가 길면 제목 신호가 희석되므로 '제목'과 '제목+메모' 중 높은 점수를 쓴다
        scores = self._scorer.scores(title)
        if description:
            with_desc = self._scorer.scores(f"{title} {description}")
            scores = {code: max(s, with_desc[code]) for code, s in scores.items()}
        scores = {code: round(s, 4) for code, s in scores.items()}

        best = max(scores, key=scores.__getitem__)
        if scores[best] < self.threshold:
            return self._result(ETC_CODE, "fallback", scores[best], scores=scores)
        return self._result(best, "similarity", scores[best], scores=scores)

    @staticmethod
    def _result(code: str, method: Method, score: float, **kwargs) -> Classification:
        return Classification(code=code, name=CATEGORY_BY_CODE[code].name, method=method, score=score, **kwargs)
