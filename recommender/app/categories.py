"""일정 분류 카테고리 정의.

카테고리 코드는 카카오 로컬 API의 category_group_code를 그대로 사용한다.
(https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-category)
장소가 필요 없거나 해당하는 카카오 카테고리가 없는 일정은 ETC(기타)로 분류한다.

일정 텍스트에 아래 키워드가 포함되면 즉시 해당 카테고리로 확정한다.
- place_keywords: 장소 이름·업종·브랜드. 매칭되면 장소 추천 시 '키워드로 장소 검색'의 검색어로 쓴다.
  (예: '스타벅스에서 스터디' → 주변 카페 전체가 아니라 주변 스타벅스)
- activity_keywords: 행동·상황을 나타내는 단어. 분류에만 쓰고, 추천은 '카테고리로 장소 검색'으로 한다.
  (예: '회식'으로 키워드 검색하면 이름에 '회식'이 들어간 곳만 나오므로 음식점 카테고리 검색이 낫다)

한 글자 키워드는 오탐(예: '술' → '기술', '미술관')이 많아 사용하지 않고, 다른 단어의 일부로
자주 쓰이는 단어('마트' → '스마트폰', '주차' → '1주차', '시청' → '드라마 시청')도 제외했다.
매칭 시 공백을 무시하므로 '약 타기'와 '약타기'는 같은 키워드로 취급된다.

- examples: 키워드 매칭이 실패했을 때 유사도 비교 대상으로 쓰는 예시 일정 문장.
"""

from dataclasses import dataclass, field

ETC_CODE = "ETC"


@dataclass(frozen=True)
class Category:
    code: str
    name: str
    description: str
    place_keywords: list[str] = field(default_factory=list)
    activity_keywords: list[str] = field(default_factory=list)
    examples: list[str] = field(default_factory=list)

    @property
    def keywords(self) -> list[str]:
        return [*self.place_keywords, *self.activity_keywords]

    @property
    def recommendable(self) -> bool:
        """카카오 장소 검색으로 주변 장소를 추천할 수 있는지 여부"""
        return self.code != ETC_CODE


CATEGORIES: list[Category] = [
    Category(
        code="MT1",
        name="대형마트",
        description="대형마트에서 장보기, 생필품과 식료품 구매",
        place_keywords=["대형마트", "이마트", "홈플러스", "롯데마트", "코스트코", "트레이더스"],
        activity_keywords=["장보기", "식료품"],
        examples=["마트 가기", "주말 장보기", "생필품 사러 가기", "일주일치 식재료 구매", "휴지랑 세제 사기", "김장 재료 사기"],
    ),
    Category(
        code="CS2",
        name="편의점",
        description="편의점 방문, 택배 접수, 간단한 물건 구매",
        place_keywords=["편의점", "씨유", "cu", "gs25", "세븐일레븐", "이마트24", "미니스톱"],
        activity_keywords=["편의점택배", "반값택배"],
        examples=["편의점 택배 보내기", "편의점 알바", "간식 사오기", "택배 접수하기"],
    ),
    Category(
        code="PS3",
        name="어린이집, 유치원",
        description="어린이집이나 유치원 등원, 하원, 상담, 행사",
        place_keywords=["어린이집", "유치원"],
        activity_keywords=["등원", "하원", "키즈노트"],
        examples=["아이 데리러 가기", "아이 등하원", "원아 학부모 상담", "재롱잔치", "아이 참관수업"],
    ),
    Category(
        code="SC4",
        name="학교",
        description="학교 수업, 강의, 시험, 학사 일정",
        place_keywords=["학교", "초등학교", "중학교", "고등학교", "대학교", "캠퍼스"],
        activity_keywords=[
            "강의", "수업", "중간고사", "기말고사", "입학식", "졸업식", "개강", "종강", "교수님", "학과",
            "조모임", "팀플", "동아리방", "학생회",
        ],
        examples=["전공 수업 듣기", "캡스톤 디자인 발표", "학부 세미나", "학생 상담", "과목 시험 보기", "연구실 미팅"],
    ),
    Category(
        code="AC5",
        name="학원",
        description="학원 수업, 과외, 레슨, 자격증 준비반",
        place_keywords=["학원", "코딩학원", "피아노", "태권도"],
        activity_keywords=["과외", "레슨", "입시반"],
        examples=["영어 회화반", "토익 수업", "수학 보충 수업", "미술 입시 준비", "자격증 대비반 수업"],
    ),
    Category(
        code="PK6",
        name="주차장",
        description="차량 주차, 주차장 이용",
        place_keywords=["주차장"],
        activity_keywords=["주차하기", "발렛"],
        examples=["차 대기", "차 세워두기", "공영 차고지 이용"],
    ),
    Category(
        code="OL7",
        name="주유소, 충전소",
        description="자동차 주유, 전기차 충전",
        place_keywords=["주유소", "충전소"],
        activity_keywords=["주유", "기름넣기", "전기차충전", "셀프주유"],
        examples=["차 기름 넣기", "전기차 배터리 충전", "LPG 충전하기"],
    ),
    Category(
        code="SW8",
        name="지하철역",
        description="지하철역에서 만남, 지하철 이용",
        place_keywords=["지하철역"],
        activity_keywords=["지하철", "전철", "번출구", "환승역"],
        examples=["역 앞에서 만나기", "개찰구 앞 집합", "강남역에서 보기", "출구 앞에서 대기"],
    ),
    Category(
        code="BK9",
        name="은행",
        description="은행 업무, 계좌 개설, 대출 상담, 환전",
        place_keywords=["은행", "농협", "새마을금고", "신협", "atm"],
        activity_keywords=["계좌개설", "대출상담", "환전", "통장"],
        examples=["적금 가입하기", "카드 재발급 받기", "대출 서류 제출", "공과금 창구 납부", "금융 상담"],
    ),
    Category(
        code="CT1",
        name="문화시설",
        description="영화, 공연, 전시, 미술관, 박물관, 도서관 등 문화생활",
        place_keywords=["영화관", "극장", "cgv", "메가박스", "롯데시네마", "미술관", "박물관", "도서관", "갤러리"],
        activity_keywords=["영화", "전시", "전시회", "공연", "뮤지컬", "연극", "콘서트", "오페라"],
        examples=["팝업 스토어 구경", "책 빌리러 가기", "아이맥스 관람", "오케스트라 관람", "작가 사인회", "책 반납하기"],
    ),
    Category(
        code="AG2",
        name="중개업소",
        description="부동산 중개업소 방문, 집 보기, 전월세 계약",
        place_keywords=["부동산", "공인중개사", "중개사무소"],
        activity_keywords=["집보러", "방보러", "매물", "전세계약", "월세계약", "임대차계약"],
        examples=["이사 갈 집 알아보기", "자취방 구하기", "원룸 둘러보기", "잔금 치르기"],
    ),
    Category(
        code="PO3",
        name="공공기관",
        description="주민센터, 구청, 우체국, 경찰서 등 관공서 민원 업무",
        place_keywords=[
            "주민센터", "행정복지센터", "동사무소", "구청", "군청", "우체국", "경찰서", "파출소", "지구대",
            "법원", "세무서", "등기소", "출입국", "보건소", "소방서",
        ],
        activity_keywords=["민원", "전입신고", "여권발급", "등본발급"],
        examples=["여권 찾으러 가기", "주민등록증 재발급", "등기 우편 보내기", "운전면허 갱신", "서류 떼러 가기"],
    ),
    Category(
        code="AT4",
        name="관광명소",
        description="여행, 관광, 나들이, 공원 산책, 명소 방문",
        place_keywords=[
            "공원", "한강", "놀이공원", "에버랜드", "롯데월드", "경복궁", "해수욕장", "전망대", "둘레길", "수목원", "동물원",
        ],
        activity_keywords=["관광", "여행", "명소", "투어", "나들이", "야경", "등산"],
        examples=["바다 보러 가기", "벚꽃 구경", "단풍 구경", "가족 소풍", "당일치기 드라이브", "산책하기"],
    ),
    Category(
        code="AD5",
        name="숙박",
        description="호텔, 펜션, 게스트하우스 등 숙소 이용",
        place_keywords=["호텔", "모텔", "펜션", "게스트하우스", "리조트"],
        activity_keywords=["숙소", "숙박", "에어비앤비", "체크인", "체크아웃", "호캉스"],
        examples=["1박 2일 묵기", "워크숍 숙소 잡기", "하룻밤 자고 오기", "MT 방 잡기"],
    ),
    Category(
        code="FD6",
        name="음식점",
        description="식사, 외식, 회식, 술자리, 맛집 방문",
        place_keywords=[
            "식당", "레스토랑", "오마카세", "뷔페", "삼겹살", "고깃집", "치킨", "피자", "초밥", "파스타", "국밥",
            "이자카야", "호프", "포차", "베이커리", "빵집",
        ],
        activity_keywords=[
            "맛집", "점심", "저녁식사", "저녁약속", "아침식사", "회식", "식사", "밥약속", "밥약", "술자리", "술약속",
            "술한잔", "뒤풀이", "뒷풀이",
        ],
        examples=["친구랑 밥 먹기", "가족 외식", "팀 저녁", "고기 먹으러 가기", "생일 파티 식사", "동기 모임", "소개팅"],
    ),
    Category(
        code="CE7",
        name="카페",
        description="카페에서 커피, 디저트, 공부, 대화",
        place_keywords=["카페", "스타벅스", "투썸", "이디야", "메가커피", "빽다방", "폴바셋", "디저트", "브런치카페"],
        activity_keywords=["커피", "스벅", "카공"],
        examples=["케이크 먹기", "라떼 한잔", "조용한 곳에서 공부하기", "수다 떨기", "과제하러 나가기"],
    ),
    Category(
        code="HP8",
        name="병원",
        description="병원 진료, 치과, 한의원, 건강검진, 예방접종",
        place_keywords=[
            "병원", "치과", "한의원", "피부과", "안과", "이비인후과", "내과", "정형외과", "소아과", "소아청소년과",
            "산부인과", "정신건강의학과", "비뇨기과",
        ],
        activity_keywords=["진료", "건강검진", "예방접종", "백신", "물리치료", "스케일링", "도수치료"],
        examples=["감기 때문에 의사 만나기", "허리 아파서 치료받기", "충치 치료", "피 검사 받기", "주사 맞기", "재활 치료"],
    ),
    Category(
        code="PM9",
        name="약국",
        description="약국 방문, 처방약 수령",
        place_keywords=["약국"],
        activity_keywords=["처방전", "처방약", "약타기", "약받기", "약사러"],
        examples=["감기약 사기", "상비약 구매", "소화제 사오기", "영양제 사기"],
    ),
    Category(
        code=ETC_CODE,
        name="기타",
        description="특정 장소가 필요 없거나 온라인, 집에서 하는 일, 마감과 기념일 같은 일정",
        activity_keywords=[
            "마감", "제출", "생일", "기념일", "알람", "월급", "급여", "납부일", "결제일", "자동이체", "재택",
            "온라인", "화상회의", "줌회의", "zoom", "웨비나", "통화", "전화하기", "디데이", "기상", "리마인더",
        ],
        examples=["과제 업로드", "보고서 작성", "엄마한테 연락", "카드값 빠져나가는 날", "집 청소", "빨래하기", "운동하기", "휴식"],
    ),
]

CATEGORY_BY_CODE: dict[str, Category] = {c.code: c for c in CATEGORIES}


def search_keyword_for(category_code: str, keyword: str | None) -> str | None:
    """분류 시 매칭된 키워드가 해당 카테고리의 장소 키워드면 검색어로 반환"""
    category = CATEGORY_BY_CODE.get(category_code)
    if category is None or keyword is None or not category.recommendable:
        return None
    return keyword if keyword in category.place_keywords else None
