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
- [x] Task 7 Vercel 계정의 GitHub Login Connection과 자동 배포 연결 검증.

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
- [x] Task 5 GitHub 푸시와 Vercel 프로덕션 배포.

## 프로젝트 핵심 기록 및 마무리 — 2026-08-08

- [x] Task 1 현재 구현, 운영 상태, 미완료 항목 확인.
- [x] Task 2 정확성 원칙, 데이터 흐름, 장애 해결법을 정본 문서로 통합.
- [x] Task 3 유지보수 명령, 배포 절차, 남은 위험과 확장 지점 기록.
- [x] Task 4 README와 오래된 설계 및 계획 문서의 상태 현행화.
- [x] Task 5 전체 테스트, 운영 주소, Git 상태 확인 후 최종 커밋과 푸시.

## 영적 보물 2 주간 성경 읽기 근거 — 2026-08-08

- [x] Task 1 주간 성경 읽기 장 범위를 로컬 성경 코어에서 펼치기.
- [x] Task 2 영적 보물 2에만 전체 읽기 범위를 AI 근거로 전달하기.
- [x] Task 3 AI가 범위 안에서 고른 특정 성구를 검증하고 화면에 표시하기.
- [x] Task 4 범위 밖 선택과 AI 실패 시 로컬 본문 기반 폴백 유지하기.
- [x] Task 5 단위 테스트, 실제 주간 API, GitHub 푸시와 Vercel 배포.

## Vercel GitHub 자동 배포 검증 - 2026-08-09

- [x] GitHub Login Connection을 Chrome에서 확인한다.
- [x] Vercel GitHub 앱을 `iam-kimleader/jw-assistant` 저장소에만 설치한다.
- [x] Vercel 프로젝트를 GitHub 저장소에 연결한다.
- [x] 검증용 문서 변경을 커밋하고 `main`에 푸시한다.
- [x] Vercel 프로덕션 배포가 자동으로 생성되고 `READY`가 되는지 확인한다.

## 웹 화면 React + Tailwind + shadcn/ui 이전 — 2026-08-26

계획 문서는 `docs/superpowers/plans/2026-08-26-web-react-migration.md` 에 있다.

- [x] Task 0 바닐라 CSS 의 간격·글자 계단을 토큰으로 정리 (이전 작업에 그대로 얹기 위함)
- [x] Task 1 Vite + React + TypeScript 골조, Tailwind v4, shadcn/ui 초기화
- [x] Task 2 색·글자·줄간격 토큰을 Tailwind `@theme` 로 옮기고 shadcn 의미 토큰을 앱 팔레트에 맞춤
- [x] Task 3 껍데기(상단 막대·내비·react-router)와 홈 화면
- [x] Task 4 `web-server.mjs` 를 `web/dist` 기준으로 바꾸고 SPA 폴백 추가
- [x] Task 5 생활과 봉사 · 파수대 연구 화면 (답변 카드, 성구 상자, 참고 출판물, 진행률 게이지)
  - 두 화면은 부르는 API 만 달라 `StudyPrep` 하나로 그린다.
  - 소제목·상위질문 머리말 규칙은 `answer-grouping.mjs` 로 떼어 내 시험 7개를 붙였다.
  - `web-reference.test.mjs` 를 `AnswerCard.tsx` 대상으로 고쳐 다시 통과시켰다.
- [x] Task 6 연설 화면 (화자 정보, 배정 카드, 공개강연 입력, 뼈대 표, 산출물 탭)
  - `공개강연입력검증` 을 `talk-input-check.mjs` 로 떼어 서버·브라우저가 한 벌만 쓰게 했다.
  - 기본프로필·스타일목록·임명목록도 `talk-profile.mjs` 를 직접 가져다 쓴다. 베낀 값이 없다.
  - 시간·파일이름 규칙은 `talk-format.mjs` 로 떼어 내 시험 9개를 붙였다.
- [x] Task 7 낡은 바닐라 파일 제거 (`app.js`, `styles.css`). `progress.js` 는 순수 함수라 남겼다.
- [x] Task 8 `vercel.json` 을 빌드 산출물 기준으로 고치기
  - `buildCommand` · `outputDirectory`(`web/dist`) 추가, 번들된 파일의 rewrite 제거.
  - `asset/` 을 Vite public 폴더로 삼아 OG 이미지가 산출물 루트로 복사된다. rewrite 가 필요 없다.
- [~] Task 9 `web-reference.test.mjs` · `web-progress.test.mjs` · `web-og.test.mjs` 를 새 구조에 맞춰 고쳤다.
  - 다만 **아직 문자열 대조다.** 진짜 컴포넌트 시험은 vitest + testing-library 를 들여야 한다.
  - 순수 함수 쪽은 제대로 덮었다 — `answer-grouping` 7개, `talk-format` 9개.
- [x] Task 10 전체 시험·빌드·타입 검사, 화면 검증
  - `npm run smoke:web` 을 만들었다. Vite SSR 로 다섯 화면을 실제로 마운트해 본다.
  - 라우트를 `React.lazy` 로 쪼갰다. 첫 화면이 gzip 153KB → 93KB 로 줄었다.
  - **브라우저 육안 확인은 여전히 못 했다.** 확장이 localhost 에 못 붙는다.

## 카카오 로그인 — 2026-08-26

계획 문서는 `docs/superpowers/plans/2026-08-26-kakao-login.md`, 설계는
`docs/superpowers/specs/2026-08-26-kakao-login-storage-design.md` 에 있다. `main` 의 `0fa512d`.

- [x] Task 1 세션 쿠키 서명·검증 (`src/session.mjs`). HMAC-SHA256, `node:crypto` 만 쓴다
- [x] Task 2 카카오 인가 코드 흐름 (`src/kakao-auth.mjs`)
- [x] Task 3 인증 서비스와 회원 기록 (`src/auth-service.mjs`)
- [x] Task 4 비공개 Blob 저장소 감싸기 (`src/store.mjs`)
- [x] Task 5 어댑터 넷 (`api/auth-start` · `auth-callback` · `auth-logout`, `src/api-guard.mjs`)
- [x] Task 6 로그인 화면과 401 처리
- [x] Task 7 환경 변수 설정과 배포 확인 (형제가 실제 로그인까지 확인함)
- [x] 초대 코드 제거. 형제 요청으로 완전히 없앴다. 카카오 계정이 있으면 누구나 들어온다

## 자료 보관 — 2026-08-27

계획은 `docs/superpowers/plans/2026-08-27-storage.md`, 설계는
`docs/superpowers/specs/2026-08-27-storage-and-mypage-design.md` 에 있다. `main` 의 `1ce14b7`.

- [x] Task 1 저장 경로를 만들고 모양을 검사한다 (`src/storage-paths.mjs`, 시험 10개)
- [x] Task 2 주간 자료를 한 번만 만들어 나눠 쓰는 캐시 (`src/week-cache.mjs`)
- [x] Task 3 연설 자료를 사람별로 보관한다 (`src/talk-store.mjs`)
- [x] Task 4 주간 답변을 회중이 나눠 쓰게 어댑터에 붙인다
- [x] Task 5 화자 설정을 서버에 둔다. 기기가 바뀌어도 따라온다
- [x] Task 6 연설 뼈대와 원고를 만들 때마다 서버에 남긴다
- [x] Task 7 저장된 답변임을 알리고 다시 만들 수 있게 한다 (`SavedNotice`)
- [x] Task 8 설정을 서버에서 받고 저장된 연설을 복원한다
- [x] Task 9 README 에 보관 구조를 적는다

## 마이페이지 — 2026-08-28

계획은 `docs/superpowers/plans/2026-08-28-mypage.md`, 설계는
`docs/superpowers/specs/2026-08-28-mypage-design.md` 에 있다. `main` 의 `30f0bef`.

- [x] Task 1 보관함 목록을 만드는 순수 모듈 (`src/archive.mjs`, 시험 10개)
- [x] Task 2 연설 자료를 지우는 함수 (`연설지우기`, 시험 3개)
- [x] Task 3 `GET /api/my-archive` 와 `DELETE /api/my-talk` 를 두 면에 단다
- [x] Task 4 화면이 쓸 호출과 내려받기를 나눠 쓰게 뺀다
- [x] Task 5 연구 화면이 `?date=` 를 받는다
- [x] Task 6 연설 화면이 `?주간=` · `?배정번호=` 를 받는다
- [x] Task 7 마이페이지 화면 (`web/src/routes/MyPage.tsx`)
- [x] Task 8 README 와 마무리 확인
- [x] 최종 검토 고침 — `vercel.json` 에 `/me` 추가, 오류 안내가 보이도록 스크롤

**남은 것.** 컴포넌트 시험은 여전히 없다. 화면 확인은 `npm run smoke:web` 의 SSR 마운트와
형제의 육안 확인 두 층뿐이다. 이월한 사소한 항목들은 `context-notes.md` 의
2026-08-28 항목에 적어 두었다.
