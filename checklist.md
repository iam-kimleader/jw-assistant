# 진행 체크리스트

계획 문서는 `docs/superpowers/plans/2026-07-29-bible-core.md` 에 있다.

## 1단계 — 성경 코어

- [x] Task 1 골조와 ZIP 리더
- [x] Task 2 성경 인덱스 추출
- [x] Task 3 성구 주소 변환 모듈
- [x] Task 4 wol 장 페이지 파서
- [x] Task 5 전권 본문 수집과 무결성 검증
- [x] Task 6 상호 참조 추출
- [x] Task 7 절 번호 모델 정정 — 시편 표제 0절과 요한복음 8장 시작 절 반영

**1단계 완료.** 66권 31,194절과 상호참조 65,578건이 master 에 있고 `npm test` · `npm run verify`
· `npm run verify:refs` 가 모두 통과한다. 김동언 형제가 시편·요한복음·역대기상 본문과
마태복음 24:14 의 참조를 직접 확인했다.

## 1단계 이후 추가한 것

- [x] 성구 조회 도구 — `성구 마태복음 24:14`. 본문과 정방향·역방향 난외 참조를 함께 펼친다

## 2단계 — `/집회준비` (파수대 연구)

- [x] Task 1 성구 라벨 해석
- [x] Task 1.5 HTML 텍스트 추출 공통화 — `src/html-text.mjs`
- [x] Task 2 기사 파서와 합성 픽스처
- [x] Task 3 ISO 주 계산과 주간 페이지 파서
- [x] Task 4 예습지 생성
- [x] Task 5 조립 스크립트와 명령어 등록
- [x] Task 6 `/집회준비` 스킬

**2단계 완료.** 인용 39건 중 39건이 해석됐고 미해결 0건이었다.

## 이후 단계

- [x] 2단계 `/집회준비` 워크플로
- [ ] 3단계 `/주제연구` 와 성구·주제 노트 체계, 연구 노트·각주 수집
- [ ] 4단계 `/통독` · `/봉사준비` · `/공개강연`

## 웹앱 전환 — 2026-08-07

계획 문서는 `docs/superpowers/plans/2026-08-07-web-app.md` 에 있다.

- [x] Task 1 Node 24 ESM 웹 서버와 정적 파일 제공.
- [x] Task 2 오늘 기준 이전 10주와 이후 10주 날짜 옵션 생성.
- [x] Task 3 파수대 연구 API와 답변 초안 생성.
- [x] Task 4 생활과 봉사 교재 API와 답변 초안 생성.
- [x] Task 5 jw.org 모티브 홈과 준비 화면 UI.
- [x] Task 6 답변 복사 버튼과 비활성 도움 카드.
- [x] Task 7 테스트와 로컬 서버 검증.

## Vercel 배포 — 2026-08-07

- [x] Task 1 Vercel 정적 라우팅과 Serverless API 어댑터 추가.
- [x] Task 2 Vercel 환경에서 WOL 캐시가 임시 디렉터리를 쓰도록 조정.
- [x] Task 3 Vercel 함수에 성경 코어 파일 포함.
- [x] Task 4 테스트 후 커밋과 GitHub 푸시.
- [x] Task 5 Vercel 프로젝트 생성과 프로덕션 배포.
- [x] Task 6 Vercel 함수의 WOL fetch 폴백 추가와 배포 API 검증.
- [ ] Task 7 Vercel 계정에 GitHub Login Connection을 추가한 뒤 자동 배포 연결.

## 회중 성서 연구 서책 수정 — 2026-08-07

- [x] Task 1 `용하`를 WOL 출판물 심벌 `wcg`로 매핑.
- [x] Task 2 `2장`과 `2 노아` 형식의 출판물 장 링크를 모두 인식.
- [x] Task 3 답 입력 칸으로 구성된 `wcg` 질문 구조를 인식.
- [x] Task 4 회귀 테스트와 전체 테스트 통과.
- [x] Task 5 2026년 8월 3일 주간 API가 「용하」 2장 노아 자료를 반환하는지 확인.
- [x] Task 6 GitHub 푸시와 Vercel 프로덕션 재배포 후 확인.

## 답변 구조와 AI 생성 개선 — 2026-08-07

- [x] Task 1 반복되는 준비 문구를 없애고 자료의 핵심 내용으로 바로 답변.
- [x] Task 2 `(ㄱ)`과 `(ㄴ)` 질문을 별도 답변과 별도 복사 단위로 분리.
- [x] Task 3 회중 성서 연구의 소제목과 질문별 삽화 URL 추출.
- [x] Task 4 서버 전용 OpenAI Responses API 답변 생성과 비밀 키 미설정 폴백.
- [x] Task 5 `답변 복사` 버튼이 답변 본문만 복사하도록 수정.
- [x] Task 6 답변 영역의 연한 초록색 배경과 소제목 화면 구분 적용.
- [x] Task 7 단위 테스트, 실제 주간 API, 데스크톱·모바일 화면 검증.
- [x] Task 8 GitHub 푸시와 Vercel 프로덕션 배포.
- [x] Task 9 Vercel에 `OPENAI_API_KEY`를 설정하고 실제 AI 응답 검증.

## OG 이미지와 AI 활성화 검증 — 2026-08-07

- [x] Task 1 `asset/og-image-jw-assistant.png`를 공개 정적 경로로 제공.
- [x] Task 2 제목, 설명, Open Graph, Twitter Card 메타데이터 추가.
- [x] Task 3 로컬 HTML과 이미지 응답 및 전체 테스트 검증.
- [x] Task 4 GitHub 푸시와 Vercel 프로덕션 재배포.
- [x] Task 5 프로덕션 OG 이미지와 실제 AI 생성 모드 검증.

## 참고 출판물 기반 답변 고도화 — 2026-08-07

- [x] Task 1 질문별 WOL 참고 출판물 링크와 표시 문구 추출.
- [x] Task 2 실제 출판물 제목, 원문 URL, 관련 본문 조회와 캐시.
- [x] Task 3 참고 출판물 본문을 AI 근거 자료에 포함하고 답변 지침 강화.
- [x] Task 4 답변별 클릭 가능한 참고 출판물 링크 표시.
- [x] Task 5 파서, AI 요청, 화면 회귀 테스트와 실제 주간 API 검증.
- [x] Task 6 커밋, GitHub 푸시, Vercel 프로덕션 배포와 확인.
- [x] Task 7 별도 참고 자료가 없는 문항에도 공식 WOL 원문 링크를 보장하고 운영에서 확인.

## 준비 진행률 원형 게이지 — 2026-08-08

- [x] Task 1 장기 API 요청에 맞춘 예상 진행률 계산과 96% 상한 구현.
- [x] Task 2 준비 상태 옆의 작은 원형 게이지와 접근성 속성 구현.
- [x] Task 3 요청 중 준비 버튼 비활성화와 성공 시 100% 완료 처리.
- [x] Task 4 단위 테스트, 전체 테스트, 데스크톱·모바일 화면 검증.
- [ ] Task 5 GitHub 푸시와 Vercel 프로덕션 배포.
