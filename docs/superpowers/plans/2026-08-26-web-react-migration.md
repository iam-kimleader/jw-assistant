# 웹 화면을 React + Tailwind + shadcn/ui 로 옮긴다 — 2026-08-26

## 왜

김동언 형제가 `CLAUDE.md` 의 "외부 npm 의존성을 추가하지 않는다" 규칙을 거두고
React + Tailwind CSS + shadcn/ui 를 쓰기로 정했다. 규칙 문장은 이미 고쳤다.

## 무엇이 바뀌고 무엇이 안 바뀌는가

**안 바뀐다.**

- `api/*.js` 여섯 개의 Vercel 함수. UI 와 완전히 분리돼 있다.
- `src/` 의 준비 로직 전부(`prep-service`, `talk-service`, `talk-outline` 등).
- API 계약. 경로, 질의 문자열, 요청·응답 모양을 그대로 둔다.
- `core/` 성경 자산.

**바뀐다.**

- `web/` — 손으로 쓴 `index.html` · `app.js` · `styles.css` · `progress.js` 가
  Vite + React 앱으로 대체된다. 빌드 산출물은 `web/dist` 다.
- `src/web-server.mjs` 의 `webRoot` 가 `web` 에서 `web/dist` 로 간다.
- `vercel.json` 의 rewrite 목록이 빌드 산출물 기준으로 바뀐다.
- `package.json` 에 의존성과 빌드 스크립트가 생긴다.

## 정한 것과 이유

- **TypeScript 를 쓴다.** shadcn/ui 의 기본 경로이고, 연설 화면의 상태가
  10개 항목짜리라 형이 있는 편이 낫다. `allowJs` 를 켜서 `src/*.mjs` 를 그대로 가져다 쓴다.
- **경로 라우팅으로 간다.** `vercel.json` 이 이미 `/life-ministry` · `/watchtower` · `/talk`
  를 `index.html` 로 넘기고 있다. 지난 검토에서 넣은 해시 라우팅은 그 자리를 메우던 임시방편이라
  react-router 로 대체한다.
- **중복된 검증 규칙을 지운다.** `app.js` 의 `공개강연입력검증` 은 "브라우저는 서버 모듈을
  import 하지 못한다" 는 이유로 `src/talk-outline.mjs` 의 규칙을 베껴 둔 것이다.
  번들러가 생겼으니 서버 모듈을 직접 가져다 쓴다. 기본프로필값 중복도 같이 지운다.
- **지난 검토의 접근성 성과를 잃지 않는다.** Radix 가 Tabs·Select 의 ARIA 와 키보드
  이동을 이미 제공한다. 초점 표시, 44px 터치 목표, `role="alert"` 오류 알림, 대비를
  맞춘 금색은 Tailwind 테마와 컴포넌트로 옮긴다.
- **방금 만든 토큰 계단을 그대로 가져간다.** `--space-*` · `--text-*` · `--leading-*` 와
  색 토큰을 Tailwind `@theme` 로 옮긴다. 값을 새로 정하지 않는다.

## 단계

1. Vite + React + TS 골조를 `web/` 에 세우고 Tailwind 와 shadcn/ui 를 붙인다.
2. 지금의 CSS 토큰을 Tailwind 테마로 옮긴다.
3. 껍데기(상단 막대, 내비, 라우터)와 홈 화면을 만든다.
4. 생활과 봉사 · 파수대 연구 화면을 만든다. 답변 카드, 성구 상자, 참고 출판물, 진행률 게이지.
5. 연설 화면을 만든다. 화자 정보, 배정 카드, 공개강연 입력, 뼈대 표, 산출물 탭.
6. `web-server.mjs` 와 `vercel.json` 을 빌드 산출물 기준으로 고친다.
7. 전체 테스트, 빌드, 데스크톱·모바일 화면 검증.

## 위험

- **배포가 깨질 수 있다.** `vercel.json` 을 잘못 고치면 다음 푸시에서 운영 사이트가
  빈 화면이 된다. 6단계에서 로컬 빌드 산출물로 먼저 확인한 뒤 손댄다.
- **화면 검증이 막혀 있다.** Chrome 확장이 `localhost` 와 `127.0.0.1` 접속에 실패한다.
  이 문제를 먼저 풀지 않으면 눈으로 확인하지 못한 채 넘어가게 된다.
- **웹 UI 를 덮는 테스트가 없다.** 306개 시험은 전부 서버 쪽이다. 옮기는 동안
  기능이 조용히 빠져도 시험이 잡아 주지 못한다. 화면별 기능 대조표로 대신한다.
