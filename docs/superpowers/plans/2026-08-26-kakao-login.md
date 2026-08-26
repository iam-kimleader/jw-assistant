# 카카오 로그인 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹앱에 카카오 로그인을 붙여, 초대 코드로 승인된 사람만 쓸 수 있게 한다.

**Architecture:** 순수 로직(세션 서명·경로 만들기)을 `src/` 의 평문 `.mjs` 모듈로 떼어 `node --test` 로 덮는다. 바깥(카카오 HTTP·Vercel Blob)을 부르는 자리는 얇은 함수로 감싸고 주입해 시험에서 갈아 끼운다. HTTP 어댑터는 Vercel 함수와 로컬 서버 둘 다 같은 서비스 함수를 부른다.

**Tech Stack:** Node 24 ESM · `node --test` · `@vercel/blob` · React 19 + Vite + shadcn/ui

**Spec:** `docs/superpowers/specs/2026-08-26-kakao-login-storage-design.md`

## Global Constraints

- Node 24 ESM. 웹 화면은 React + Tailwind CSS + shadcn/ui 로 만든다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- 새 소스 파일의 첫 줄은 역할을 설명하는 한국어 한 줄 주석이다. 설정 파일은 예외다.
- 한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.
- 비밀값을 `.env.example` 에 넣지 않는다. 실제 값은 `.env` 에만 둔다.
- 시험은 `npm test` 로 돈다. 새 시험 파일은 `src/*.test.mjs` 다.
- 카카오와 Blob 은 시험에서 실제로 부르지 않는다. 주입해서 갈아 끼운다.
- 이 계획은 설계 10절의 1~2단계만 다룬다. 3~4단계(자료 보관)는 별도 계획이다.

## 설계에서 벗어난 것 하나

설계 11절의 환경 변수 넷에 더해 **`APP_BASE_URL` 을 추가한다.** 카카오에 넘기는
`redirect_uri` 는 등록된 값과 글자 하나까지 같아야 하는데, 요청 헤더에서 만들면
프리뷰 배포마다 호스트가 달라져 `KOE006` 이 난다. 환경 변수로 명시하는 편이 확실하다.

```
APP_BASE_URL=http://localhost:3000              (로컬)
APP_BASE_URL=https://jw-assistant-seven.vercel.app   (Vercel)
```

## 파일 구조

**새로 만드는 것**

| 파일 | 책임 |
|---|---|
| `src/session.mjs` | 세션 쿠키 서명·검증, 쿠키 헤더 만들기·읽기. 순수 함수 |
| `src/session.test.mjs` | 위 시험 |
| `src/store.mjs` | Vercel Blob 감싸기. 판 번호 확인 |
| `src/store.test.mjs` | 가짜 blob 을 주입해 시험 |
| `src/kakao-auth.mjs` | 카카오 세 엔드포인트 호출 |
| `src/kakao-auth.test.mjs` | 가짜 fetch 를 주입해 시험 |
| `src/auth-service.mjs` | 로그인 시작·완료·초대 확인 흐름 |
| `src/auth-service.test.mjs` | 가짜 카카오·저장소를 주입해 시험 |
| `api/auth-start.js` | Vercel 어댑터 |
| `api/auth-callback.js` | Vercel 어댑터 |
| `api/auth-invite.js` | Vercel 어댑터 |
| `api/auth-logout.js` | Vercel 어댑터 |
| `web/src/routes/Login.tsx` | 로그인 화면 |
| `web/src/routes/Invite.tsx` | 초대 코드 화면 |

**고치는 것**

| 파일 | 무엇을 |
|---|---|
| `src/web-server.mjs` | 인증 네 경로를 더하고, 기존 여섯에 세션 가드를 건다 |
| `api/options.js` 외 5개 | 세션 가드를 건다 |
| `web/src/App.tsx` | 세션 확인, 로그인 화면 라우팅, 상단 막대 닉네임·로그아웃 |
| `web/src/lib/api.ts` | 401 을 만나면 로그인 화면으로 보낸다 |
| `web/src/smoke.tsx` | 새 화면 둘을 더한다 |
| `.env.example` | 환경 변수 다섯을 빈칸으로 적는다 |
| `vercel.json` | `/login`·`/invite` rewrite 를 더한다 |

---

### Task 1: 세션 쿠키 서명과 검증

**Files:**
- Create: `src/session.mjs`
- Test: `src/session.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `세션만들기(사용자, 비밀, 지금?, 유효기간초?) -> string`
    사용자는 `{회원번호: string, 닉네임: string}`
  - `세션읽기(값, 비밀, 지금?) -> {회원번호, 닉네임} | null`
  - `쿠키만들기(이름, 값, 수명초, {보안?}) -> string`
  - `쿠키읽기(쿠키헤더, 이름) -> string | null`
  - `쿠키지우기(이름, {보안?}) -> string`

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/session.test.mjs`

```js
// 세션 쿠키의 서명과 검증을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 세션만들기, 세션읽기, 쿠키만들기, 쿠키읽기, 쿠키지우기 } from './session.mjs';

const 비밀 = 'test-secret-do-not-use';
const 사용자 = { 회원번호: '1234567890', 닉네임: '동언' };
const 지금 = 1_700_000_000_000;

test('만든 세션을 그대로 읽는다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금);
  assert.deepEqual(세션읽기(값, 비밀, 지금 + 1_000), 사용자);
});

test('본문을 고치면 서명이 깨져 거부한다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금);
  const [본문, 서명] = 값.split('.');
  const 위조본문 = Buffer.from(
    JSON.stringify({ 회원번호: '9999', 닉네임: '남', 만료: 지금 + 999_999 }),
    'utf8',
  ).toString('base64url');
  assert.equal(세션읽기(`${위조본문}.${서명}`, 비밀, 지금), null);
  assert.notEqual(본문, 위조본문);
});

test('다른 비밀로 서명한 값은 거부한다', () => {
  const 값 = 세션만들기(사용자, '다른비밀', 지금);
  assert.equal(세션읽기(값, 비밀, 지금), null);
});

test('만료된 세션은 거부한다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금, 60);
  assert.deepEqual(세션읽기(값, 비밀, 지금 + 59_000), 사용자);
  assert.equal(세션읽기(값, 비밀, 지금 + 61_000), null);
});

test('만료는 발급 시점 기준이고 읽어도 늘지 않는다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금, 100);
  세션읽기(값, 비밀, 지금 + 50_000);
  assert.equal(세션읽기(값, 비밀, 지금 + 101_000), null);
});

test('모양이 아닌 값은 조용히 거부한다', () => {
  for (const 값 of [null, undefined, '', '점없음', '.', 'a.b', 'a.b.c']) {
    assert.equal(세션읽기(값, 비밀, 지금), null);
  }
});

test('쿠키 헤더를 만든다', () => {
  const 헤더 = 쿠키만들기('세션', 'abc', 60, { 보안: true });
  assert.match(헤더, /^세션=abc;/);
  assert.match(헤더, /HttpOnly/);
  assert.match(헤더, /SameSite=Lax/);
  assert.match(헤더, /Path=\//);
  assert.match(헤더, /Max-Age=60/);
  assert.match(헤더, /Secure/);
});

test('로컬에서는 Secure 를 빼서 http 로도 오간다', () => {
  assert.doesNotMatch(쿠키만들기('세션', 'abc', 60, { 보안: false }), /Secure/);
});

test('쿠키 헤더에서 이름으로 값을 찾는다', () => {
  const 헤더 = '가=1; 세션=abc.def; 나=2';
  assert.equal(쿠키읽기(헤더, '세션'), 'abc.def');
  assert.equal(쿠키읽기(헤더, '없음'), null);
  assert.equal(쿠키읽기(undefined, '세션'), null);
});

test('값에 등호가 있어도 끝까지 읽는다', () => {
  assert.equal(쿠키읽기('세션=a=b=c', '세션'), 'a=b=c');
});

test('지우는 쿠키는 Max-Age 가 0 이다', () => {
  assert.match(쿠키지우기('세션', { 보안: true }), /Max-Age=0/);
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test --no-warnings src/session.test.mjs`
Expected: FAIL — `Cannot find module './session.mjs'`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/session.mjs`

```js
// 로그인 세션을 서명 쿠키 하나로 다룬다. 서버에 세션 표를 두지 않는다.
import { createHmac, timingSafeEqual } from 'node:crypto';

const 기본유효기간초 = 30 * 24 * 60 * 60;

function 서명(본문, 비밀) {
  return createHmac('sha256', 비밀).update(본문).digest('base64url');
}

export function 세션만들기(사용자, 비밀, 지금 = Date.now(), 유효기간초 = 기본유효기간초) {
  const 담긴것 = {
    회원번호: String(사용자.회원번호),
    닉네임: String(사용자.닉네임 ?? ''),
    만료: 지금 + 유효기간초 * 1_000,
  };
  const 본문 = Buffer.from(JSON.stringify(담긴것), 'utf8').toString('base64url');
  return `${본문}.${서명(본문, 비밀)}`;
}

export function 세션읽기(값, 비밀, 지금 = Date.now()) {
  if (typeof 값 !== 'string') return null;
  const 조각 = 값.split('.');
  if (조각.length !== 2) return null;
  const [본문, 받은서명] = 조각;
  if (!본문 || !받은서명) return null;

  const 바른서명 = 서명(본문, 비밀);
  // 길이가 다르면 timingSafeEqual 이 던지므로 먼저 본다.
  if (받은서명.length !== 바른서명.length) return null;
  if (!timingSafeEqual(Buffer.from(받은서명), Buffer.from(바른서명))) return null;

  let 담긴것;
  try {
    담긴것 = JSON.parse(Buffer.from(본문, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!담긴것?.만료 || 담긴것.만료 <= 지금) return null;
  return { 회원번호: String(담긴것.회원번호), 닉네임: String(담긴것.닉네임 ?? '') };
}

export function 쿠키만들기(이름, 값, 수명초, { 보안 = true } = {}) {
  const 조각 = [`${이름}=${값}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${수명초}`];
  if (보안) 조각.push('Secure');
  return 조각.join('; ');
}

export function 쿠키지우기(이름, 설정) {
  return 쿠키만들기(이름, '', 0, 설정);
}

export function 쿠키읽기(쿠키헤더, 이름) {
  for (const 조각 of String(쿠키헤더 ?? '').split(';')) {
    const 다듬은것 = 조각.trim();
    const 등호 = 다듬은것.indexOf('=');
    if (등호 < 1) continue;
    if (다듬은것.slice(0, 등호) === 이름) return 다듬은것.slice(등호 + 1);
  }
  return null;
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test --no-warnings src/session.test.mjs`
Expected: PASS, 11 tests

- [ ] **Step 5: 커밋한다**

```bash
git add src/session.mjs src/session.test.mjs
git commit -m "세션을 서명 쿠키 하나로 다루는 모듈을 만든다"
```

---

### Task 2: 저장소 감싸기

**Files:**
- Create: `src/store.mjs`
- Test: `src/store.test.mjs`
- Modify: `package.json` (`@vercel/blob` 의존성)

**Interfaces:**
- Consumes: 없음
- Produces:
  - `저장소만들기(blob) -> {읽기, 쓰기, 목록, 지우기}`
    `blob` 은 `@vercel/blob` 의 `{put, get, list, del}` 이다
  - `읽기(경로) -> object | null` — 없거나 판이 다르면 `null`
  - `쓰기(경로, 내용) -> void`
  - `목록(접두사) -> string[]` — 경로 문자열 배열
  - `지우기(경로) -> void`
  - `현재판` — 숫자 상수 `1`

- [ ] **Step 1: 의존성을 넣는다**

```bash
npm install @vercel/blob
```

- [ ] **Step 2: 실패하는 시험을 쓴다**

`src/store.test.mjs`

```js
// Blob 저장소 감싸기의 판 번호 확인과 오류 견딤을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 저장소만들기, 현재판 } from './store.mjs';

function 가짜blob(초기 = {}) {
  const 담긴것 = new Map(Object.entries(초기));
  return {
    담긴것,
    부른것: [],
    async put(경로, 본문, 설정) {
      this.부른것.push({ 이름: 'put', 경로, 설정 });
      담긴것.set(경로, 본문);
    },
    async get(경로, 설정) {
      this.부른것.push({ 이름: 'get', 경로, 설정 });
      if (!담긴것.has(경로)) return null;
      return { stream: new Response(담긴것.get(경로)).body };
    },
    async list({ prefix }) {
      return {
        blobs: [...담긴것.keys()]
          .filter(k => k.startsWith(prefix))
          .map(pathname => ({ pathname })),
        hasMore: false,
      };
    },
    async del(경로) {
      this.부른것.push({ 이름: 'del', 경로 });
      담긴것.delete(경로);
    },
  };
}

test('쓴 것을 그대로 읽는다', async () => {
  const blob = 가짜blob();
  const 저장소 = 저장소만들기(blob);
  await 저장소.쓰기('users/1/profile.json', { 닉네임: '동언' });
  assert.deepEqual(await 저장소.읽기('users/1/profile.json'), {
    판: 현재판,
    닉네임: '동언',
  });
});

test('쓸 때 판 번호를 붙이고 비공개로 덮어쓰기를 허용한다', async () => {
  const blob = 가짜blob();
  await 저장소만들기(blob).쓰기('가.json', { 값: 1 });
  const 부름 = blob.부른것.find(x => x.이름 === 'put');
  assert.equal(부름.설정.access, 'private');
  assert.equal(부름.설정.allowOverwrite, true);
  assert.equal(부름.설정.contentType, 'application/json');
  assert.equal(JSON.parse(blob.담긴것.get('가.json')).판, 현재판);
});

test('없는 것은 null 이다', async () => {
  assert.equal(await 저장소만들기(가짜blob()).읽기('없음.json'), null);
});

test('판이 다르면 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '낡음.json': JSON.stringify({ 판: 0, 값: 1 }) });
  assert.equal(await 저장소만들기(blob).읽기('낡음.json'), null);
});

test('판이 아예 없어도 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '옛것.json': JSON.stringify({ 값: 1 }) });
  assert.equal(await 저장소만들기(blob).읽기('옛것.json'), null);
});

test('깨진 JSON 은 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '깨짐.json': '{{{' });
  assert.equal(await 저장소만들기(blob).읽기('깨짐.json'), null);
});

test('읽기가 던져도 null 로 넘긴다', async () => {
  const blob = 가짜blob();
  blob.get = async () => {
    throw new Error('망가짐');
  };
  assert.equal(await 저장소만들기(blob).읽기('가.json'), null);
});

test('접두사로 목록을 뽑는다', async () => {
  const blob = 가짜blob({
    'users/1/talks/가.json': '{}',
    'users/1/talks/나.json': '{}',
    'users/2/talks/다.json': '{}',
  });
  assert.deepEqual(await 저장소만들기(blob).목록('users/1/talks/'), [
    'users/1/talks/가.json',
    'users/1/talks/나.json',
  ]);
});

test('지운다', async () => {
  const blob = 가짜blob({ '가.json': '{}' });
  await 저장소만들기(blob).지우기('가.json');
  assert.equal(blob.담긴것.has('가.json'), false);
});
```

- [ ] **Step 3: 실패를 확인한다**

Run: `node --test --no-warnings src/store.test.mjs`
Expected: FAIL — `Cannot find module './store.mjs'`

- [ ] **Step 4: 최소 구현을 쓴다**

`src/store.mjs`

```js
// Vercel Blob 비공개 저장소를 감싼다. 판 번호가 다르면 없는 것으로 본다.
export const 현재판 = 1;

export function 저장소만들기(blob) {
  return {
    async 읽기(경로) {
      try {
        const 응답 = await blob.get(경로, { access: 'private' });
        if (!응답?.stream) return null;
        const 담긴것 = JSON.parse(await new Response(응답.stream).text());
        // 낡은 모양은 마이그레이션하지 않는다. 없는 것으로 보고 새로 만들게 한다.
        return 담긴것?.판 === 현재판 ? 담긴것 : null;
      } catch {
        // 저장은 편의이지 필수가 아니다. 읽기 실패로 화면을 막지 않는다.
        return null;
      }
    },

    async 쓰기(경로, 내용) {
      await blob.put(경로, JSON.stringify({ 판: 현재판, ...내용 }), {
        access: 'private',
        contentType: 'application/json',
        allowOverwrite: true,
      });
    },

    async 목록(접두사) {
      const 결과 = await blob.list({ prefix: 접두사 });
      return (결과?.blobs ?? []).map(x => x.pathname);
    },

    async 지우기(경로) {
      await blob.del(경로);
    },
  };
}
```

- [ ] **Step 5: 통과를 확인한다**

Run: `node --test --no-warnings src/store.test.mjs`
Expected: PASS, 9 tests

- [ ] **Step 6: 커밋한다**

```bash
git add src/store.mjs src/store.test.mjs package.json package-lock.json
git commit -m "Vercel Blob 비공개 저장소를 감싸는 모듈을 만든다"
```

---

### Task 3: 카카오 호출 감싸기

**Files:**
- Create: `src/kakao-auth.mjs`
- Test: `src/kakao-auth.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `인가주소({restApiKey, redirectUri}, state) -> string`
  - `토큰받기({restApiKey, clientSecret, redirectUri}, code, fetch) -> string` (액세스 토큰)
  - `사용자정보(액세스토큰, fetch) -> {회원번호: string, 닉네임: string}`
  - 실패 시 `Error` 를 던진다. 메시지에 카카오가 준 코드가 들어간다

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/kakao-auth.test.mjs`

```js
// 카카오 로그인 엔드포인트 호출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 인가주소, 토큰받기, 사용자정보 } from './kakao-auth.mjs';

const 설정 = {
  restApiKey: 'KEY',
  clientSecret: 'SECRET',
  redirectUri: 'http://localhost:3000/api/auth-callback',
};

function 가짜응답(본문, ok = true) {
  return { ok, async json() { return 본문; } };
}

test('인가 주소에 필요한 값이 모두 들어간다', () => {
  const 주소 = new URL(인가주소(설정, 'STATE123'));
  assert.equal(주소.origin + 주소.pathname, 'https://kauth.kakao.com/oauth/authorize');
  assert.equal(주소.searchParams.get('client_id'), 'KEY');
  assert.equal(주소.searchParams.get('redirect_uri'), 설정.redirectUri);
  assert.equal(주소.searchParams.get('response_type'), 'code');
  assert.equal(주소.searchParams.get('state'), 'STATE123');
});

test('인가 주소에 client_secret 을 넣지 않는다', () => {
  assert.doesNotMatch(인가주소(설정, 'S'), /SECRET/);
});

test('토큰을 받는다', async () => {
  let 부른것 = null;
  const 가짜fetch = async (주소, 설정값) => {
    부른것 = { 주소, 설정값 };
    return 가짜응답({ access_token: 'TOKEN' });
  };
  assert.equal(await 토큰받기(설정, 'CODE', 가짜fetch), 'TOKEN');
  assert.equal(부른것.주소, 'https://kauth.kakao.com/oauth/token');
  assert.equal(부른것.설정값.method, 'POST');
  const 몸 = new URLSearchParams(부른것.설정값.body);
  assert.equal(몸.get('grant_type'), 'authorization_code');
  assert.equal(몸.get('client_id'), 'KEY');
  assert.equal(몸.get('client_secret'), 'SECRET');
  assert.equal(몸.get('redirect_uri'), 설정.redirectUri);
  assert.equal(몸.get('code'), 'CODE');
});

test('토큰 오류는 카카오가 준 코드를 담아 던진다', async () => {
  const 가짜fetch = async () =>
    가짜응답({ error: 'invalid_grant', error_code: 'KOE320' }, false);
  await assert.rejects(() => 토큰받기(설정, 'CODE', 가짜fetch), /KOE320/);
});

test('토큰이 없으면 던진다', async () => {
  const 가짜fetch = async () => 가짜응답({});
  await assert.rejects(() => 토큰받기(설정, 'CODE', 가짜fetch));
});

test('사용자 정보에서 회원번호와 닉네임을 뽑는다', async () => {
  let 부른것 = null;
  const 가짜fetch = async (주소, 설정값) => {
    부른것 = { 주소, 설정값 };
    return 가짜응답({ id: 1234567890, properties: { nickname: '동언' } });
  };
  assert.deepEqual(await 사용자정보('TOKEN', 가짜fetch), {
    회원번호: '1234567890',
    닉네임: '동언',
  });
  assert.equal(부른것.주소, 'https://kapi.kakao.com/v2/user/me');
  assert.equal(부른것.설정값.headers.Authorization, 'Bearer TOKEN');
});

test('닉네임 동의를 안 했으면 빈 문자열로 둔다', async () => {
  const 가짜fetch = async () => 가짜응답({ id: 7 });
  assert.deepEqual(await 사용자정보('T', 가짜fetch), { 회원번호: '7', 닉네임: '' });
});

test('사용자 정보 오류는 던진다', async () => {
  const 가짜fetch = async () => 가짜응답({ msg: '만료', code: -401 }, false);
  await assert.rejects(() => 사용자정보('T', 가짜fetch));
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test --no-warnings src/kakao-auth.test.mjs`
Expected: FAIL — `Cannot find module './kakao-auth.mjs'`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/kakao-auth.mjs`

```js
// 카카오 로그인의 세 엔드포인트를 부른다. 2026-08-26 공식 문서 기준이다.
const 인가엔드포인트 = 'https://kauth.kakao.com/oauth/authorize';
const 토큰엔드포인트 = 'https://kauth.kakao.com/oauth/token';
const 사용자엔드포인트 = 'https://kapi.kakao.com/v2/user/me';

export function 인가주소({ restApiKey, redirectUri }, state) {
  const 질의 = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  return `${인가엔드포인트}?${질의}`;
}

export async function 토큰받기({ restApiKey, clientSecret, redirectUri }, code, 부르기 = fetch) {
  const 응답 = await 부르기(토큰엔드포인트, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: restApiKey,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });
  const 자료 = await 응답.json();
  // 설정이 틀렸을 때 카카오가 KOE004·KOE006 같은 코드를 준다. 그대로 올려야 고칠 수 있다.
  if (!응답.ok || !자료?.access_token) {
    const 코드 = 자료?.error_code ?? 자료?.error ?? '알 수 없음';
    throw new Error(`카카오 토큰을 받지 못했습니다. (${코드})`);
  }
  return 자료.access_token;
}

export async function 사용자정보(액세스토큰, 부르기 = fetch) {
  const 응답 = await 부르기(사용자엔드포인트, {
    headers: { Authorization: `Bearer ${액세스토큰}` },
  });
  const 자료 = await 응답.json();
  if (!응답.ok || 자료?.id === undefined) {
    const 코드 = 자료?.code ?? 자료?.msg ?? '알 수 없음';
    throw new Error(`카카오 사용자 정보를 받지 못했습니다. (${코드})`);
  }
  return {
    회원번호: String(자료.id),
    닉네임: String(자료.properties?.nickname ?? ''),
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test --no-warnings src/kakao-auth.test.mjs`
Expected: PASS, 8 tests

- [ ] **Step 5: 커밋한다**

```bash
git add src/kakao-auth.mjs src/kakao-auth.test.mjs
git commit -m "카카오 로그인 엔드포인트를 부르는 모듈을 만든다"
```

---

### Task 4: 인증 흐름 서비스

**Files:**
- Create: `src/auth-service.mjs`
- Test: `src/auth-service.test.mjs`

**Interfaces:**
- Consumes: `src/kakao-auth.mjs`, `src/store.mjs`, `src/session.mjs`
- Produces:
  - `인증만들기({설정, 카카오, 저장소, 무작위?, 지금?}) -> {로그인시작, 로그인완료, 초대확인, 사용자경로}`
  - `로그인시작() -> {위치: string, state: string}`
  - `로그인완료({code, state, 저장된state}) -> {결과: '승인'|'초대필요'|'거부', 사용자?, 신원?, 사유?}`
  - `초대확인({코드, 신원}) -> {통과: boolean, 사용자?}`
  - `사용자경로(회원번호) -> string`

`설정` 은 `{restApiKey, clientSecret, redirectUri, 초대코드}` 다.

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/auth-service.test.mjs`

```js
// 로그인 시작·완료와 초대 코드 확인 흐름을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 인증만들기 } from './auth-service.mjs';

const 설정 = {
  restApiKey: 'KEY',
  clientSecret: 'SECRET',
  redirectUri: 'http://localhost:3000/api/auth-callback',
  초대코드: '열려라',
};

function 가짜저장소(초기 = {}) {
  const 담긴것 = new Map(Object.entries(초기));
  return {
    담긴것,
    async 읽기(경로) { return 담긴것.get(경로) ?? null; },
    async 쓰기(경로, 내용) { 담긴것.set(경로, 내용); },
    async 목록() { return [...담긴것.keys()]; },
    async 지우기(경로) { 담긴것.delete(경로); },
  };
}

const 가짜카카오 = {
  인가주소: (_설정, state) => `https://kauth.example/authorize?state=${state}`,
  토큰받기: async () => 'TOKEN',
  사용자정보: async () => ({ 회원번호: '777', 닉네임: '동언' }),
};

function 만들기(저장소 = 가짜저장소(), 카카오 = 가짜카카오) {
  return 인증만들기({ 설정, 카카오, 저장소, 무작위: () => 'STATE123', 지금: () => 1_000 });
}

test('로그인 시작이 state 와 카카오 주소를 준다', () => {
  const { 위치, state } = 만들기().로그인시작();
  assert.equal(state, 'STATE123');
  assert.match(위치, /state=STATE123/);
});

test('state 가 다르면 거부한다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: '다름', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '거부');
});

test('state 가 없으면 거부한다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: null, 저장된state: null,
  });
  assert.equal(결과.결과, '거부');
});

test('승인된 사람은 바로 들어온다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/profile.json': { 회원번호: '777', 닉네임: '동언' },
  });
  const 결과 = await 만들기(저장소).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '승인');
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
});

test('처음 온 사람은 초대가 필요하다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '초대필요');
  assert.deepEqual(결과.신원, { 회원번호: '777', 닉네임: '동언' });
});

test('카카오가 실패하면 사유를 담아 거부한다', async () => {
  const 카카오 = { ...가짜카카오, 토큰받기: async () => { throw new Error('KOE006'); } };
  const 결과 = await 만들기(가짜저장소(), 카카오).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '거부');
  assert.match(결과.사유, /KOE006/);
});

test('초대 코드가 맞으면 승인 기록을 남긴다', async () => {
  const 저장소 = 가짜저장소();
  const 결과 = await 만들기(저장소).초대확인({
    코드: '열려라', 신원: { 회원번호: '777', 닉네임: '동언' },
  });
  assert.equal(결과.통과, true);
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
  const 기록 = 저장소.담긴것.get('users/777/profile.json');
  assert.equal(기록.회원번호, '777');
  assert.equal(기록.닉네임, '동언');
  assert.equal(typeof 기록.승인된때, 'string');
});

test('초대 코드가 틀리면 기록을 남기지 않는다', async () => {
  const 저장소 = 가짜저장소();
  const 결과 = await 만들기(저장소).초대확인({
    코드: '틀림', 신원: { 회원번호: '777', 닉네임: '동언' },
  });
  assert.equal(결과.통과, false);
  assert.equal(저장소.담긴것.size, 0);
});

test('신원이 없으면 초대를 통과시키지 않는다', async () => {
  const 결과 = await 만들기().초대확인({ 코드: '열려라', 신원: null });
  assert.equal(결과.통과, false);
});

test('사용자 경로를 만든다', () => {
  assert.equal(만들기().사용자경로('777'), 'users/777/profile.json');
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test --no-warnings src/auth-service.test.mjs`
Expected: FAIL — `Cannot find module './auth-service.mjs'`

- [ ] **Step 3: 최소 구현을 쓴다**

`src/auth-service.mjs`

```js
// 카카오 로그인 흐름을 엮는다. HTTP 를 모르므로 어댑터가 결과를 응답으로 옮긴다.
export function 인증만들기({ 설정, 카카오, 저장소, 무작위, 지금 = () => Date.now() }) {
  const 사용자경로 = 회원번호 => `users/${회원번호}/profile.json`;

  return {
    사용자경로,

    로그인시작() {
      const state = 무작위();
      return { 위치: 카카오.인가주소(설정, state), state };
    },

    async 로그인완료({ code, state, 저장된state }) {
      if (!state || !저장된state || state !== 저장된state) {
        return { 결과: '거부', 사유: '로그인 요청이 확인되지 않았습니다. 다시 시도해 주십시오.' };
      }
      if (!code) return { 결과: '거부', 사유: '인가 코드가 없습니다.' };

      let 신원;
      try {
        // 카카오 토큰은 여기서만 쓰고 버린다. 보관하지 않는다.
        const 액세스토큰 = await 카카오.토큰받기(설정, code);
        신원 = await 카카오.사용자정보(액세스토큰);
      } catch (실패) {
        return { 결과: '거부', 사유: 실패.message };
      }

      const 기록 = await 저장소.읽기(사용자경로(신원.회원번호));
      if (기록) {
        // 닉네임은 카카오에서 바뀔 수 있으므로 방금 받은 것을 쓴다.
        return { 결과: '승인', 사용자: { 회원번호: 신원.회원번호, 닉네임: 신원.닉네임 } };
      }
      return { 결과: '초대필요', 신원 };
    },

    async 초대확인({ 코드, 신원 }) {
      if (!신원?.회원번호) return { 통과: false };
      if (!설정.초대코드 || 코드 !== 설정.초대코드) return { 통과: false };

      const 사용자 = { 회원번호: 신원.회원번호, 닉네임: 신원.닉네임 ?? '' };
      await 저장소.쓰기(사용자경로(사용자.회원번호), {
        ...사용자,
        승인된때: new Date(지금()).toISOString(),
      });
      return { 통과: true, 사용자 };
    },
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test --no-warnings src/auth-service.test.mjs`
Expected: PASS, 10 tests

- [ ] **Step 5: 커밋한다**

```bash
git add src/auth-service.mjs src/auth-service.test.mjs
git commit -m "로그인 시작·완료와 초대 확인 흐름을 엮는다"
```

---

### Task 5: 실행 환경 조립과 HTTP 어댑터

**Files:**
- Create: `src/auth-runtime.mjs`
- Create: `api/auth-start.js`, `api/auth-callback.js`, `api/auth-invite.js`, `api/auth-logout.js`
- Modify: `src/web-server.mjs`
- Test: `src/auth-runtime.test.mjs`

**Interfaces:**
- Consumes: Task 1·2·3·4 전부
- Produces:
  - `인증가져오기() -> 인증만들기(...) 의 결과` — 환경 변수로 조립하고 재사용한다
  - `설정읽기() -> {restApiKey, clientSecret, redirectUri, 초대코드, 세션비밀, 보안}`
  - `세션쿠키이름`, `상태쿠키이름`, `신원쿠키이름` — 문자열 상수
  - `요청사용자(쿠키헤더) -> {회원번호, 닉네임} | null`

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/auth-runtime.test.mjs`

```js
// 환경 변수로 인증 설정을 조립하는 부분을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 설정읽기, 요청사용자, 세션쿠키이름 } from './auth-runtime.mjs';
import { 세션만들기, 쿠키만들기 } from './session.mjs';

function 환경으로(값들, 할일) {
  const 이전 = { ...process.env };
  Object.assign(process.env, 값들);
  try {
    return 할일();
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in 이전)) delete process.env[k];
    Object.assign(process.env, 이전);
  }
}

test('환경 변수에서 설정을 읽는다', () => {
  const 설정 = 환경으로(
    {
      KAKAO_REST_API_KEY: 'KEY',
      KAKAO_CLIENT_SECRET: 'SECRET',
      SESSION_SECRET: 'SESSION',
      INVITE_CODE: '열려라',
      APP_BASE_URL: 'https://example.com',
    },
    설정읽기,
  );
  assert.equal(설정.restApiKey, 'KEY');
  assert.equal(설정.clientSecret, 'SECRET');
  assert.equal(설정.세션비밀, 'SESSION');
  assert.equal(설정.초대코드, '열려라');
  assert.equal(설정.redirectUri, 'https://example.com/api/auth-callback');
});

test('APP_BASE_URL 끝의 빗금을 지운다', () => {
  const 설정 = 환경으로({ APP_BASE_URL: 'https://example.com/' }, 설정읽기);
  assert.equal(설정.redirectUri, 'https://example.com/api/auth-callback');
});

test('Vercel 에서만 Secure 쿠키를 쓴다', () => {
  assert.equal(환경으로({ VERCEL: '1' }, 설정읽기).보안, true);
  assert.equal(환경으로({}, () => 설정읽기()).보안, false);
});

test('세션 쿠키에서 사용자를 꺼낸다', () => {
  환경으로({ SESSION_SECRET: 'SESSION' }, () => {
    const 값 = 세션만들기({ 회원번호: '7', 닉네임: '동언' }, 'SESSION');
    const 헤더 = 쿠키만들기(세션쿠키이름, 값, 60, { 보안: false }).split(';')[0];
    assert.deepEqual(요청사용자(헤더), { 회원번호: '7', 닉네임: '동언' });
    assert.equal(요청사용자('없음=1'), null);
    assert.equal(요청사용자(undefined), null);
  });
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test --no-warnings src/auth-runtime.test.mjs`
Expected: FAIL — `Cannot find module './auth-runtime.mjs'`

- [ ] **Step 3: 실행 환경 조립을 쓴다**

`src/auth-runtime.mjs`

```js
// 환경 변수로 인증 부품을 조립한다. 어댑터가 공통으로 가져다 쓴다.
import { randomBytes } from 'node:crypto';
import * as blob from '@vercel/blob';
import { 인증만들기 } from './auth-service.mjs';
import { 저장소만들기 } from './store.mjs';
import { 인가주소, 토큰받기, 사용자정보 } from './kakao-auth.mjs';
import { 세션읽기, 쿠키읽기 } from './session.mjs';

export const 세션쿠키이름 = 'jw_session';
export const 상태쿠키이름 = 'jw_state';
export const 신원쿠키이름 = 'jw_pending';
export const 짧은쿠키수명초 = 600;

export function 설정읽기() {
  const 기본주소 = String(process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    restApiKey: process.env.KAKAO_REST_API_KEY ?? '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
    redirectUri: `${기본주소}/api/auth-callback`,
    초대코드: process.env.INVITE_CODE ?? '',
    세션비밀: process.env.SESSION_SECRET ?? '',
    // 로컬은 http 라 Secure 를 붙이면 브라우저가 쿠키를 돌려주지 않는다.
    보안: Boolean(process.env.VERCEL),
  };
}

// 함수 인스턴스가 살아 있는 동안 재사용한다. 기존 talk-draft.js 와 같은 방식이다.
let 캐시된인증 = null;

export function 인증가져오기() {
  return (캐시된인증 ??= 인증만들기({
    설정: 설정읽기(),
    카카오: { 인가주소, 토큰받기, 사용자정보 },
    저장소: 저장소만들기(blob),
    무작위: () => randomBytes(16).toString('base64url'),
  }));
}

export function 요청사용자(쿠키헤더) {
  const 값 = 쿠키읽기(쿠키헤더, 세션쿠키이름);
  if (!값) return null;
  return 세션읽기(값, 설정읽기().세션비밀);
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test --no-warnings src/auth-runtime.test.mjs`
Expected: PASS, 4 tests

- [ ] **Step 5: Vercel 어댑터 넷을 쓴다**

`api/auth-start.js`

```js
// Vercel에서 카카오 인가 화면으로 보내는 어댑터
import { 인증가져오기, 설정읽기, 상태쿠키이름, 짧은쿠키수명초 } from '../src/auth-runtime.mjs';
import { 쿠키만들기 } from '../src/session.mjs';

export default function handler(_req, res) {
  const { 위치, state } = 인증가져오기().로그인시작();
  res.setHeader('Set-Cookie', 쿠키만들기(상태쿠키이름, state, 짧은쿠키수명초, 설정읽기()));
  res.writeHead(302, { Location: 위치 }).end();
}
```

`api/auth-callback.js`

```js
// Vercel에서 카카오 인가 코드를 받아 세션을 발급하는 어댑터
import {
  인증가져오기, 설정읽기, 세션쿠키이름, 상태쿠키이름, 신원쿠키이름, 짧은쿠키수명초,
} from '../src/auth-runtime.mjs';
import { 세션만들기, 쿠키만들기, 쿠키지우기, 쿠키읽기 } from '../src/session.mjs';

const 서른일 = 30 * 24 * 60 * 60;

export default async function handler(req, res) {
  const 설정 = 설정읽기();
  const 주소 = new URL(req.url, `http://${req.headers.host}`);
  const 결과 = await 인증가져오기().로그인완료({
    code: 주소.searchParams.get('code'),
    state: 주소.searchParams.get('state'),
    저장된state: 쿠키읽기(req.headers.cookie, 상태쿠키이름),
  });

  const 지울상태 = 쿠키지우기(상태쿠키이름, 설정);

  if (결과.결과 === '승인') {
    const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
    res.setHeader('Set-Cookie', [지울상태, 쿠키만들기(세션쿠키이름, 세션, 서른일, 설정)]);
    res.writeHead(302, { Location: '/' }).end();
    return;
  }

  if (결과.결과 === '초대필요') {
    // 초대 화면으로 넘길 신원만 짧게 들고 간다. 세션이 아니다.
    const 신원 = 세션만들기(결과.신원, 설정.세션비밀, Date.now(), 짧은쿠키수명초);
    res.setHeader('Set-Cookie', [지울상태, 쿠키만들기(신원쿠키이름, 신원, 짧은쿠키수명초, 설정)]);
    res.writeHead(302, { Location: '/invite' }).end();
    return;
  }

  res.setHeader('Set-Cookie', 지울상태);
  res.writeHead(302, { Location: `/login?오류=${encodeURIComponent(결과.사유 ?? '')}` }).end();
}
```

`api/auth-invite.js`

```js
// Vercel에서 초대 코드를 확인하고 승인 기록을 남기는 어댑터
import {
  인증가져오기, 설정읽기, 세션쿠키이름, 신원쿠키이름,
} from '../src/auth-runtime.mjs';
import { 세션만들기, 세션읽기, 쿠키만들기, 쿠키지우기, 쿠키읽기 } from '../src/session.mjs';

const 서른일 = 30 * 24 * 60 * 60;

export default async function handler(req, res) {
  const 설정 = 설정읽기();
  const 신원 = 세션읽기(쿠키읽기(req.headers.cookie, 신원쿠키이름), 설정.세션비밀);
  if (!신원) {
    res.status(401).json({ error: '로그인부터 다시 해 주십시오.' });
    return;
  }

  const 결과 = await 인증가져오기().초대확인({ 코드: req.body?.코드 ?? '', 신원 });
  if (!결과.통과) {
    res.status(400).json({ error: '초대 코드가 맞지 않습니다.' });
    return;
  }

  const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
  res.setHeader('Set-Cookie', [
    쿠키지우기(신원쿠키이름, 설정),
    쿠키만들기(세션쿠키이름, 세션, 서른일, 설정),
  ]);
  res.status(200).json({ 닉네임: 결과.사용자.닉네임 });
}
```

`api/auth-logout.js`

```js
// Vercel에서 세션 쿠키를 지우는 어댑터
import { 설정읽기, 세션쿠키이름 } from '../src/auth-runtime.mjs';
import { 쿠키지우기 } from '../src/session.mjs';

export default function handler(_req, res) {
  res.setHeader('Set-Cookie', 쿠키지우기(세션쿠키이름, 설정읽기()));
  res.status(200).json({ 나감: true });
}
```

- [ ] **Step 6: 로컬 서버에 같은 네 경로를 붙인다**

`src/web-server.mjs` 의 `handle()` 안, 기존 `/api/options` 분기 **앞**에 넣는다.
로컬 개발에서도 로그인이 돌아야 하기 때문이다.

```js
    if (url.pathname === '/api/auth-start') {
      const { 위치, state } = 인증가져오기().로그인시작();
      res.writeHead(302, {
        Location: 위치,
        'Set-Cookie': 쿠키만들기(상태쿠키이름, state, 짧은쿠키수명초, 설정읽기()),
      }).end();
      return;
    }
    if (url.pathname === '/api/auth-callback') {
      await 로그인완료처리(req, res, url);
      return;
    }
    if (url.pathname === '/api/auth-invite' && req.method === 'POST') {
      await 초대처리(req, res);
      return;
    }
    if (url.pathname === '/api/auth-logout' && req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 쿠키지우기(세션쿠키이름, 설정읽기()),
      }).end(JSON.stringify({ 나감: true }));
      return;
    }
```

`로그인완료처리` 와 `초대처리` 는 `api/auth-callback.js`·`api/auth-invite.js` 와 같은
내용을 `node:http` 의 `res` 로 옮겨 적은 것이다. 같은 파일 안에 함수로 둔다.

- [ ] **Step 7: 로컬에서 손으로 확인한다**

```bash
npm run build:web
node --no-warnings src/web-server.mjs
```

브라우저에서 `http://localhost:3000/api/auth-start` 를 연다.
Expected: 카카오 로그인 화면으로 넘어간다. `KOE004` 가 나오면 카카오 콘솔에서
카카오 로그인 활성화가 꺼져 있는 것이고, `KOE006` 이면 Redirect URI 가 안 맞는 것이다.

- [ ] **Step 8: 커밋한다**

```bash
git add src/auth-runtime.mjs src/auth-runtime.test.mjs api/auth-*.js src/web-server.mjs
git commit -m "카카오 로그인 네 엔드포인트를 Vercel과 로컬 서버에 붙인다"
```

---

### Task 6: 기존 API에 세션 가드

**Files:**
- Create: `src/api-guard.mjs`
- Test: `src/api-guard.test.mjs`
- Modify: `api/options.js`, `api/watchtower.js`, `api/life-ministry.js`, `api/talk-assignments.js`, `api/talk-outline.js`, `api/talk-draft.js`
- Modify: `src/web-server.mjs`

**Interfaces:**
- Consumes: `요청사용자` (Task 5)
- Produces:
  - `가드(handler) -> handler` — Vercel 핸들러를 감싸 401 을 돌려준다.
    통과하면 `req.사용자` 에 `{회원번호, 닉네임}` 을 넣는다

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/api-guard.test.mjs`

```js
// 세션 없는 요청을 막는 가드를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 가드 } from './api-guard.mjs';
import { 세션만들기 } from './session.mjs';
import { 세션쿠키이름 } from './auth-runtime.mjs';

function 가짜응답() {
  return {
    코드: null, 몸: null,
    status(c) { this.코드 = c; return this; },
    json(b) { this.몸 = b; return this; },
  };
}

test('세션이 없으면 401 이고 안쪽 핸들러를 부르지 않는다', async () => {
  let 불렸나 = false;
  const 감싼것 = 가드(async () => { 불렸나 = true; });
  const res = 가짜응답();
  await 감싼것({ headers: {} }, res);
  assert.equal(res.코드, 401);
  assert.equal(불렸나, false);
});

test('망가진 세션도 401 이다', async () => {
  const res = 가짜응답();
  await 가드(async () => {})({ headers: { cookie: `${세션쿠키이름}=엉터리` } }, res);
  assert.equal(res.코드, 401);
});

test('세션이 있으면 통과시키고 사용자를 얹는다', async () => {
  const 이전 = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'SESSION';
  try {
    const 값 = 세션만들기({ 회원번호: '7', 닉네임: '동언' }, 'SESSION');
    const req = { headers: { cookie: `${세션쿠키이름}=${값}` } };
    let 본사용자 = null;
    await 가드(async r => { 본사용자 = r.사용자; })(req, 가짜응답());
    assert.deepEqual(본사용자, { 회원번호: '7', 닉네임: '동언' });
  } finally {
    if (이전 === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = 이전;
  }
});
```

- [ ] **Step 2: 실패를 확인한다**

Run: `node --test --no-warnings src/api-guard.test.mjs`
Expected: FAIL — `Cannot find module './api-guard.mjs'`

- [ ] **Step 3: 구현을 쓴다**

`src/api-guard.mjs`

```js
// 로그인하지 않은 요청을 401로 막는다. 화면이 그것을 보고 로그인으로 보낸다.
import { 요청사용자 } from './auth-runtime.mjs';

export function 가드(handler) {
  return async function (req, res) {
    const 사용자 = 요청사용자(req.headers?.cookie);
    if (!사용자) {
      res.status(401).json({ error: '로그인이 필요합니다.' });
      return;
    }
    req.사용자 = 사용자;
    return handler(req, res);
  };
}
```

- [ ] **Step 4: 통과를 확인한다**

Run: `node --test --no-warnings src/api-guard.test.mjs`
Expected: PASS, 3 tests

- [ ] **Step 5: 여섯 어댑터를 감싼다**

각 파일에서 `export default handler` 를 `export default 가드(handler)` 로 바꾸고
import 를 더한다. `api/options.js` 예시다.

```js
// Vercel에서 주간 선택 옵션을 제공하는 Serverless Function
import { buildWeekOptions, localToday } from '../src/web-options.mjs';
import { 가드 } from '../src/api-guard.mjs';

function handler(req, res) {
  res.status(200).json({
    today: localToday().toISOString().slice(0, 10),
    weeks: buildWeekOptions(),
    사용자: { 닉네임: req.사용자.닉네임 },
  });
}

export default 가드(handler);
```

`options` 응답에 `사용자` 를 더하는 이유가 있다. 화면이 뜰 때 이미 부르는 호출이라
로그인 여부와 닉네임을 얻으려고 엔드포인트를 새로 만들 필요가 없다.

나머지 다섯(`watchtower`, `life-ministry`, `talk-assignments`, `talk-outline`,
`talk-draft`)은 `사용자` 를 응답에 넣지 않고 `가드(handler)` 로 감싸기만 한다.

- [ ] **Step 6: 로컬 서버에도 같은 가드를 건다**

`src/web-server.mjs` 의 `handle()` 에서 인증 네 경로를 지난 뒤, 나머지 `/api/` 로
시작하는 경로를 처리하기 전에 한 번만 본다.

```js
    if (url.pathname.startsWith('/api/')) {
      const 사용자 = 요청사용자(req.headers.cookie);
      if (!사용자) {
        json(res, 401, { error: '로그인이 필요합니다.' });
        return;
      }
      req.사용자 = 사용자;
    }
```

`/api/options` 응답에 `사용자: { 닉네임: req.사용자.닉네임 }` 을 더한다.

- [ ] **Step 7: 전체 시험을 돌린다**

Run: `npm test`
Expected: 전부 통과. 실패가 나면 그 시험이 무엇을 기대하는지 읽고 고친다.

- [ ] **Step 8: 커밋한다**

```bash
git add src/api-guard.mjs src/api-guard.test.mjs api/ src/web-server.mjs
git commit -m "기존 API 전부에 세션 가드를 걸고 옵션 응답에 닉네임을 싣는다"
```

---

### Task 7: 로그인·초대 화면과 라우팅 가드

**Files:**
- Create: `web/src/routes/Login.tsx`, `web/src/routes/Invite.tsx`
- Modify: `web/src/App.tsx`, `web/src/lib/api.ts`, `web/src/lib/use-weeks.ts`, `web/src/smoke.tsx`

**Interfaces:**
- Consumes: `GET /api/options` 가 `{today, weeks, 사용자:{닉네임}}` 또는 401
- Produces: `로그인필요오류` 클래스 — `api.ts` 가 401 에 던지고 App 이 잡는다

- [ ] **Step 1: 401 을 구분할 수 있게 한다**

`web/src/lib/api.ts` 의 `요청` 을 고친다.

```ts
export class 로그인필요오류 extends Error {
  constructor() {
    super('로그인이 필요합니다.');
    this.name = '로그인필요오류';
  }
}

async function 요청<T>(url: string, 설정?: RequestInit): Promise<T> {
  const response = await fetch(url, 설정);
  if (response.status === 401) throw new 로그인필요오류();
  const data = await response.json();
  if (!response.ok || data?.error) throw new Error(data?.error || '요청에 실패했습니다.');
  return data as T;
}
```

`주간목록()` 의 반환 타입에 `사용자` 를 더한다.

```ts
export function 주간목록() {
  return 요청<{ today: string; weeks: 주간[]; 사용자: { 닉네임: string } }>('/api/options');
}
```

`web/src/lib/talk-api.ts` 의 `요청` 에도 같은 401 처리를 넣는다.

- [ ] **Step 2: 로그인 화면을 만든다**

`web/src/routes/Login.tsx`

```tsx
// 카카오 로그인으로 보내는 화면이다.
import { useSearchParams } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import { cn } from '@/lib/utils';

export default function Login() {
  const [질의] = useSearchParams();
  const 오류 = 질의.get('오류');

  return (
    <section aria-labelledby="login-title" className="mx-auto grid max-w-md gap-4">
      <div className={cn(판넬, 'grid gap-4 p-5 text-center')}>
        <h1 id="login-title" className="text-2xl leading-tight">
          로그인이 필요합니다
        </h1>
        <p className="m-0 text-ink-muted">
          카카오 계정으로 들어오시면 준비한 자료가 저장됩니다.
        </p>
        <a
          href="/api/auth-start"
          className={cn(buttonVariants(), 'min-h-11 font-bold')}
        >
          카카오로 로그인
        </a>
      </div>
      {오류 && (
        <StatusBox 경고 역할="alert">
          {오류}
        </StatusBox>
      )}
    </section>
  );
}
```

버튼 대신 `<a>` 를 쓴 이유가 있다. 이 저장소의 shadcn 은 Radix 가 아니라 Base UI 라
`asChild` 가 없다. `render` 프롭이 그 자리를 대신하지만 `nativeButton` 같은 부수
속성이 따라붙는다. 로그인은 그냥 주소 이동이므로 `buttonVariants()` 로 모양만 입힌
평범한 링크가 맞다. 브라우저의 새 탭 열기도 그대로 된다.

- [ ] **Step 3: 초대 화면을 만든다**

`web/src/routes/Invite.tsx`

```tsx
// 처음 들어온 사람에게 초대 코드를 받는 화면이다.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import { cn } from '@/lib/utils';

export default function Invite() {
  const [코드, set코드] = useState('');
  const [오류, set오류] = useState('');
  const [보내는중, set보내는중] = useState(false);

  async function 확인하기() {
    set보내는중(true);
    set오류('');
    try {
      const 응답 = await fetch('/api/auth-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 코드 }),
      });
      const 자료 = await 응답.json();
      if (!응답.ok) throw new Error(자료?.error ?? '확인에 실패했습니다.');
      // 세션 쿠키가 방금 생겼다. 통째로 다시 읽어 들이는 편이 확실하다.
      window.location.assign('/');
    } catch (실패) {
      set오류(실패 instanceof Error ? 실패.message : '확인에 실패했습니다.');
      set보내는중(false);
    }
  }

  return (
    <section aria-labelledby="invite-title" className="mx-auto grid max-w-md gap-4">
      <div className={cn(판넬, 'grid gap-4 p-5')}>
        <h1 id="invite-title" className="text-2xl leading-tight">
          초대 코드를 넣어 주십시오
        </h1>
        <p className="m-0 text-ink-muted">
          처음 오셨습니다. 회중에서 받으신 코드를 넣으시면 다음부터는 바로 들어오십니다.
        </p>
        <div className="grid gap-1">
          <Label htmlFor="invite-code" className="text-sm font-bold text-ink-muted">
            초대 코드
          </Label>
          <Input
            id="invite-code"
            value={코드}
            onChange={e => set코드(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && 코드.trim() && 확인하기()}
            className="min-h-11"
          />
        </div>
        <Button
          type="button"
          onClick={확인하기}
          disabled={보내는중 || !코드.trim()}
          aria-busy={보내는중}
          className="min-h-11 font-bold"
        >
          확인
        </Button>
      </div>
      {오류 && (
        <StatusBox 경고 역할="alert">
          {오류}
        </StatusBox>
      )}
    </section>
  );
}
```

초대에 성공하면 `useNavigate` 가 아니라 `window.location.assign('/')` 을 쓴다.
세션 쿠키가 방금 생겼으므로 앱을 통째로 다시 읽어 들여야 `App` 이 로그인 상태를
새로 확인한다. 라우터로만 옮기면 예전 상태가 남는다.

- [ ] **Step 4: App 에 세션 확인과 상단 막대를 붙인다**

`web/src/App.tsx` 를 고친다.

```tsx
const [사용자, set사용자] = useState<{ 닉네임: string } | null>(null);
const [확인중, set확인중] = useState(true);
const 위치 = useLocation();

useEffect(() => {
  let 살아있음 = true;
  주간목록().then(
    자료 => { if (살아있음) { set사용자(자료.사용자); set확인중(false); } },
    실패 => {
      if (!살아있음) return;
      set사용자(null);
      set확인중(false);
      if (!(실패 instanceof 로그인필요오류)) console.error(실패);
    },
  );
  return () => { 살아있음 = false; };
}, []);

const 열린화면 = 위치.pathname === '/login' || 위치.pathname === '/invite';
if (확인중) return <p role="status" className="p-8">확인하는 중입니다.</p>;
if (!사용자 && !열린화면) return <Navigate to="/login" replace />;
```

상단 막대 오른쪽 끝에 닉네임과 로그아웃을 넣는다.

```tsx
{사용자 && (
  <div className="flex items-center gap-3">
    <span className="text-sm">{사용자.닉네임 || '형제'}</span>
    <button
      type="button"
      className="min-h-11 rounded px-3 text-white/80 hover:bg-white/12 hover:text-white"
      onClick={async () => {
        await fetch('/api/auth-logout', { method: 'POST' });
        window.location.assign('/login');
      }}
    >
      로그아웃
    </button>
  </div>
)}
```

`/login` 과 `/invite` 라우트를 더한다. 이 둘은 lazy 로 하지 않는다. 로그인 안 된
사람이 가장 먼저 보는 화면이라 한 번 더 기다리게 할 이유가 없다.

- [ ] **Step 5: 스모크에 새 화면을 더한다**

`web/src/smoke.tsx` 의 `화면들` 에 두 줄을 더한다.

```tsx
  { 이름: '로그인', 경로: '/login', 화면: <Login /> },
  { 이름: '초대', 경로: '/invite', 화면: <Invite /> },
```

- [ ] **Step 6: 확인한다**

```bash
npx tsc --noEmit
npm run smoke:web
npm run build:web
```

Expected: 타입 검사 통과, 스모크 7화면 전부 렌더 성공, 빌드 통과.

- [ ] **Step 7: 커밋한다**

```bash
git add web/src
git commit -m "로그인과 초대 화면을 만들고 로그인 안 된 사람을 보낸다"
```

---

### Task 8: 배포 설정과 실제 확인

**Files:**
- Modify: `.env.example`, `vercel.json`, `README.md`

- [ ] **Step 1: `.env.example` 에 다섯을 빈칸으로 적는다**

```
# 카카오 로그인. 카카오 디벨로퍼스에서 받는다.
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
# 세션 쿠키 서명 열쇠. 바꾸면 모두 로그아웃된다.
#   node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
SESSION_SECRET=
# 첫 로그인 때 받을 초대 코드.
INVITE_CODE=
# 카카오에 등록한 주소와 글자 하나까지 같아야 한다.
APP_BASE_URL=http://localhost:3000
```

- [ ] **Step 2: `vercel.json` 에 새 화면 rewrite 를 더한다**

기존 셋 옆에 둘을 더한다.

```json
    { "source": "/login", "destination": "/index.html" },
    { "source": "/invite", "destination": "/index.html" }
```

- [ ] **Step 3: 전체를 확인한다**

```bash
npm test
npx tsc --noEmit
npm run build:web
npm run smoke:web
```

Expected: 전부 통과.

- [ ] **Step 4: 커밋하고 브랜치를 민다**

```bash
git add .env.example vercel.json README.md
git commit -m "로그인 화면 rewrite와 환경 변수 예시를 더한다"
git push -u origin <브랜치이름>
```

- [ ] **Step 5: Vercel 환경 변수를 넣는다**

Vercel 프로젝트 설정 → Environment Variables 에 다섯을 넣는다.
`APP_BASE_URL` 은 `https://jw-assistant-seven.vercel.app` 이다.

Blob 저장소를 만들지 않았으면 여기서 만든다. **접근 방식을 `Private` 로 한다.
만든 뒤에는 바꿀 수 없다.** 만들고 프로젝트에 Connect 하면 자격 증명이 자동으로 들어간다.

- [ ] **Step 6: 프리뷰 배포에서 실제로 로그인해 본다**

프리뷰 URL 로는 카카오 Redirect URI 가 맞지 않아 `KOE006` 이 난다. 확인은
프로덕션 머지 뒤에 한다. 그전까지는 로컬에서 본다.

```bash
npm run build:web && node --no-warnings src/web-server.mjs
```

브라우저에서 `http://localhost:3000/` 을 연다.

Expected 순서
1. `/login` 으로 튕긴다
2. 카카오로 로그인을 누르면 카카오 동의 화면이 뜬다
3. 동의하면 `/invite` 로 온다
4. 초대 코드를 넣으면 `/` 로 오고 상단 막대에 닉네임이 보인다
5. 로그아웃하면 다시 `/login` 이다

**여기서 팀원이 아닌 카카오 계정으로도 되는지 확인한다.** 설계 9절의 미확인
위험이다. 막히면 카카오 콘솔에서 팀원으로 등록하거나 앱을 배포 상태로 올린다.

- [ ] **Step 7: 머지하고 프로덕션에서 확인한다**

`main` 에 머지하고 푸시한 뒤 `https://jw-assistant-seven.vercel.app/` 에서
6단계를 그대로 다시 한다.

---

## 자체 검토

**설계 대비 빠진 것**

설계 5·6절의 자료 보관(주간 공유 캐시, 다시 만들기, 연설 저장, `/my` 화면)은
이 계획에 없다. 의도한 것이다. 설계 10절의 3~4단계이며 이 계획이 배포되어
카카오 로그인이 실제로 되는 것을 확인한 뒤 별도 계획으로 쓴다.

설계 7절의 오류 처리 중 이 계획이 덮는 것은 세션 없음(Task 6), `state` 불일치
(Task 4), 토큰 교환 실패(Task 3·4), 승인 안 된 사람(Task 4), 초대 코드 틀림
(Task 4), Blob 읽기 실패(Task 2)다. Blob 쓰기 실패와 동시 재생성은 자료 보관
계획에서 다룬다.

**설계에 더한 것**

- `APP_BASE_URL` 환경 변수. 이유는 위에 적었다
- `GET /api/options` 응답에 `사용자`. 엔드포인트를 새로 만들지 않으려고 그렇게 했다
- `src/auth-runtime.mjs`. 설계에 없던 파일이나, 환경 변수 조립을 한곳에 모으지
  않으면 어댑터 다섯 곳에 같은 코드가 흩어진다

**이름 대조**

`세션만들기`·`세션읽기`·`쿠키만들기`·`쿠키읽기`·`쿠키지우기`(Task 1),
`저장소만들기`·`현재판`(Task 2), `인가주소`·`토큰받기`·`사용자정보`(Task 3),
`인증만들기`·`로그인시작`·`로그인완료`·`초대확인`·`사용자경로`(Task 4),
`인증가져오기`·`설정읽기`·`요청사용자`·`세션쿠키이름`·`상태쿠키이름`·`신원쿠키이름`·
`짧은쿠키수명초`(Task 5), `가드`(Task 6), `로그인필요오류`(Task 7).
뒤 과제가 부르는 이름이 앞 과제가 내보내는 이름과 모두 맞는다.
