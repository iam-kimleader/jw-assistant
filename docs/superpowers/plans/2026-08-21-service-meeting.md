# 봉사인도 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 노션 `봉사모임` 데이터베이스를 읽어 다음에 다룰 주제를 제시하고, 고른 주제로 봉사모임 원고를 만들어, 형제가 확인한 뒤에만 노션에 새 행으로 저장하는 로컬 전용 기능을 만든다.

**Architecture:** 준비를 후보 제시, 원고 생성, 노션 저장 세 단계 API로 나눈다. WOL 「야외 봉사」 색인 777개 주제는 미리 `src/service-topics.json`으로 굳혀 두고 런타임은 그 JSON만 읽는다. `/pc/` 실시간 해석은 형제가 고른 후보 하나에만 한다. 성구 본문은 언제나 `core/bible/text/`에서만 온다.

**Tech Stack:** Node 24 ESM, `node --test`, 기본 `fetch`, 외부 npm 의존성 없음. OpenAI Responses API, 노션 REST v1 (`2022-06-28`).

**Spec:** `docs/superpowers/specs/2026-08-21-service-meeting-design.md`

## Global Constraints

- Node 24 ESM만 쓴다. 외부 npm 의존성을 추가하지 않는다.
- 새 소스 파일의 첫 줄은 역할을 설명하는 한국어 한 줄 주석이다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- 한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.
- 성구 인용은 `core/bible/text/`에서 실제로 읽은 문자열만 쓴다. 모델이 쓴 성구 문장을 그대로 쓰는 경로를 만들지 않는다.
- 출판물 근거를 찾지 못한 문장에는 `출판물 근거 미확인 — 내 정리임.`을 붙인다.
- 조회한 출판물은 URL과 조회 날짜를 함께 남긴다.
- 노션 클라이언트에 `PATCH`와 `DELETE`를 넣지 않는다.
- `api/*.js`와 `vercel.json`은 이번 범위에서 건드리지 않는다.
- 비밀 키는 서버 환경 변수로만 읽는다. 브라우저 코드, 로그, Git에 넣지 않는다.
- 테스트는 `node --test`로 돌리며 네트워크를 타지 않는다. 실제 조회가 필요한 검증은 과제 10에서 사람이 한 번 돌린다.
- 기준선은 172개 중 170개 통과, 2개 스킵, 실패 0개다. 이보다 줄면 안 된다.

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/service-topics.mjs` | WOL 색인 HTML을 주제 객체로 바꾸고 매니페스트를 읽는다 |
| `src/service-topics.json` | 생성된 주제 매니페스트. 라벨과 링크만 담는다 |
| `scripts/refresh-service-topics.mjs` | 매니페스트를 만들고 기준선을 감시한다 |
| `src/notion-client.mjs` | 노션 읽기 두 가지와 쓰기 한 가지. 순수 파서를 따로 내보낸다 |
| `src/openai-text.mjs` | 자유 형식 구조화 출력 전용 최소 OpenAI 호출 |
| `src/service-meeting.mjs` | 후보 선정과 원고 조립. 성구 검증을 포함한다 |
| `src/web-server.mjs` | 라우트 세 개를 더한다 |
| `web/index.html` `web/app.js` `web/styles.css` | 봉사인도 화면 |

---

### Task 1: 색인 파서

**Files:**
- Create: `src/service-topics.mjs`
- Create: `src/service-topics.test.mjs`
- Create: `tests/fixtures/wol-야외봉사-색인.html`

**Interfaces:**
- Consumes: 없음.
- Produces: `parseTopicIndex(html)` → `{ 주제들, 통계 }`. `주제들`은 `{ [라벨]: { 상위: string|null, 참고: [{ 표시: string, pc: string }] } }`. `통계`는 `{ 소제목: number, 하위: number, 링크: number }`.

- [ ] **Step 1: 픽스처를 만든다**

`tests/fixtures/wol-야외봉사-색인.html` 에 실물 마크업의 함정을 심어 둔다. 소제목 세 개, 하위 항목 하나, 링크 없는 소제목 하나다.

```html
<article class="article" id="article">
<h1>야외 봉사</h1>
<p id="p10" data-pid="10" class="st">워치 타워 출판물 색인 1986-2026</p>
<p id="p27" data-pid="27" class="su">관심이 자라게 함: <a href="/ko/wol/pc/r8/lp-ko/1200272149/23/0">파19.07 15-16;</a><a href="/ko/wol/pc/r8/lp-ko/1200272149/23/2"> 파16.08 27-28</a></p>
<p id="p31" data-pid="31" class="su">개인적 목표: <a href="/ko/wol/pc/r8/lp-ko/1200272149/12/0">파21.08 24-25</a></p>
<p id="p32" data-pid="32" class="sv">도달하기 위해 받을 수 있는 도움: <a href="/ko/wol/pc/r8/lp-ko/1200272149/12/4">파94 9/15 14-15</a></p>
<p id="p40" data-pid="40" class="su">게을리하지 않음: 통-1 98-99</p>
</article>
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/service-topics.test.mjs` 를 만든다.

```javascript
// WOL 야외 봉사 색인 파서와 주제 매니페스트 로더를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTopicIndex } from './service-topics.mjs';

const html = readFileSync('tests/fixtures/wol-야외봉사-색인.html', 'utf8');

test('소제목과 하위 항목을 모두 주제로 뽑는다', () => {
  const { 주제들, 통계 } = parseTopicIndex(html);

  assert.equal(통계.소제목, 3);
  assert.equal(통계.하위, 1);
  assert.equal(통계.링크, 4);
  assert.deepEqual(Object.keys(주제들).sort(), [
    '개인적 목표', '게을리하지 않음', '관심이 자라게 함', '도달하기 위해 받을 수 있는 도움',
  ]);
});

test('하위 항목은 직전 소제목을 상위로 가리킨다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.equal(주제들['개인적 목표'].상위, null);
  assert.equal(주제들['도달하기 위해 받을 수 있는 도움'].상위, '개인적 목표');
});

test('출판물 약칭과 pc 링크를 짝지어 담는다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.deepEqual(주제들['관심이 자라게 함'].참고, [
    { 표시: '파19.07 15-16', pc: '/ko/wol/pc/r8/lp-ko/1200272149/23/0' },
    { 표시: '파16.08 27-28', pc: '/ko/wol/pc/r8/lp-ko/1200272149/23/2' },
  ]);
});

test('링크가 없는 소제목도 빈 참고로 남긴다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.deepEqual(주제들['게을리하지 않음'].참고, []);
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-topics.test.mjs`
Expected: FAIL. `service-topics.mjs` 가 없다.

- [ ] **Step 4: 파서를 구현한다**

`src/service-topics.mjs` 를 만든다. 속성 순서를 믿지 않는다. 여는 태그를 통째로 잡은 뒤 속성을 각각 확인한다. `class` 는 공백으로 쪼개 낱말 단위로 비교한다. 이 저장소가 `wol-chapter.mjs` 와 `wol-article.mjs` 에서 이미 정한 규칙이다.

```javascript
// WOL 야외 봉사 색인을 봉사모임 주제 목록으로 바꾸는 파서
import { htmlToText } from './html-text.mjs';

function 클래스들(여는태그) {
  const m = 여는태그.match(/\bclass\s*=\s*"([^"]*)"/);
  return m ? m[1].trim().split(/\s+/) : [];
}

function 링크들(본문) {
  const 결과 = [];
  for (const m of 본문.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = m[1].match(/\bhref\s*=\s*"([^"]*)"/)?.[1] ?? '';
    if (!href.includes('/wol/pc/')) continue;
    const 표시 = htmlToText(m[2]).replace(/[;,\s]+$/, '').trim();
    if (표시) 결과.push({ 표시, pc: href });
  }
  return 결과;
}

export function parseTopicIndex(html) {
  const 주제들 = {};
  let 소제목 = 0;
  let 하위 = 0;
  let 링크 = 0;
  let 직전소제목 = null;

  for (const m of String(html).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const classes = 클래스들(m[1]);
    const 소 = classes.includes('su');
    const 하 = classes.includes('sv');
    if (!소 && !하) continue;

    const 전체 = htmlToText(m[2]);
    const 라벨 = 전체.split(':')[0].trim();
    if (!라벨) continue;

    const 참고 = 링크들(m[2]);
    주제들[라벨] = { 상위: 소 ? null : 직전소제목, 참고 };
    링크 += 참고.length;
    if (소) {
      소제목 += 1;
      직전소제목 = 라벨;
    } else {
      하위 += 1;
    }
  }

  return { 주제들, 통계: { 소제목, 하위, 링크 } };
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/service-topics.test.mjs`
Expected: PASS 4개.

- [ ] **Step 6: 커밋한다**

```bash
git add src/service-topics.mjs src/service-topics.test.mjs tests/fixtures/wol-야외봉사-색인.html
git commit -m "야외 봉사 색인을 주제 목록으로 파싱한다"
```

---

### Task 2: 주제 매니페스트 생성

**Files:**
- Modify: `src/service-topics.mjs` (`기준선`, `색인URL`, `loadTopics` 를 더한다)
- Modify: `src/service-topics.test.mjs` (기준선 테스트를 더한다)
- Create: `scripts/refresh-service-topics.mjs`
- Create: `src/service-topics.json` (스크립트 실행 산출물)
- Modify: `package.json` 의 `scripts`

**Interfaces:**
- Consumes: `parseTopicIndex(html)`.
- Produces: `loadTopics(path = 'src/service-topics.json')` → `주제들` 객체. `기준선` 상수 `{ 소제목: 295, 하위: 482, 링크: 2591 }`. `색인URL` 상수.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/service-topics.test.mjs` 의 import 줄에 `기준선` 과 `loadTopics` 를 더하고, 파일 끝에 테스트를 더한다.

```javascript
import { existsSync } from 'node:fs';
import { 기준선, loadTopics } from './service-topics.mjs';

const 매니페스트없음 = !existsSync('src/service-topics.json');

test('매니페스트가 기준선 규모를 유지한다', { skip: 매니페스트없음 }, () => {
  const 주제들 = loadTopics();
  const 라벨들 = Object.keys(주제들);
  const 소제목수 = 라벨들.filter(라벨 => 주제들[라벨].상위 === null).length;
  const 하위수 = 라벨들.length - 소제목수;
  const 링크수 = 라벨들.reduce((합, 라벨) => 합 + 주제들[라벨].참고.length, 0);

  assert.ok(소제목수 >= 기준선.소제목, `소제목 ${소제목수}개는 기준선 ${기준선.소제목}개보다 적다`);
  assert.ok(하위수 >= 기준선.하위, `하위 ${하위수}개는 기준선 ${기준선.하위}개보다 적다`);
  assert.ok(링크수 >= 기준선.링크, `링크 ${링크수}개는 기준선 ${기준선.링크}개보다 적다`);
});

test('매니페스트의 모든 참고 링크는 pc 경로다', { skip: 매니페스트없음 }, () => {
  const 주제들 = loadTopics();
  for (const [라벨, 주제] of Object.entries(주제들)) {
    for (const 참고 of 주제.참고) {
      assert.ok(참고.pc.includes('/wol/pc/'), `${라벨}의 링크가 pc 경로가 아니다: ${참고.pc}`);
    }
  }
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-topics.test.mjs`
Expected: FAIL. `기준선` 과 `loadTopics` 가 없다.

- [ ] **Step 3: 로더와 기준선을 더한다**

`src/service-topics.mjs` 의 첫 줄 주석 아래 import 부분에 `readFileSync` 를 더하고, `parseTopicIndex` 위에 상수와 로더를 더한다.

```javascript
import { readFileSync } from 'node:fs';

export const 기준선 = { 소제목: 295, 하위: 482, 링크: 2591 };
export const 색인URL = 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1200272149';

export function loadTopics(path = 'src/service-topics.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}
```

- [ ] **Step 4: 생성 스크립트를 쓴다**

`scripts/refresh-service-topics.mjs` 를 만든다. 기준선보다 줄면 시끄럽게 알리고 종료 코드 1로 끝낸다. 파서가 조용히 얇아지지 않게 하는 것이 목적이다.

```javascript
// WOL 야외 봉사 색인을 읽어 봉사모임 주제 매니페스트를 갱신하는 스크립트
import { writeFileSync } from 'node:fs';
import { fetchCached } from '../src/wol-fetch.mjs';
import { parseTopicIndex, 기준선, 색인URL } from '../src/service-topics.mjs';

const 대상 = 'src/service-topics.json';

const html = await fetchCached(색인URL, 'doc-1200272149.html');
const { 주제들, 통계 } = parseTopicIndex(html);

console.log(`소제목 ${통계.소제목}개, 하위 ${통계.하위}개, 링크 ${통계.링크}개를 뽑았다.`);

const 부족 = [];
if (통계.소제목 < 기준선.소제목) 부족.push(`소제목 ${통계.소제목} < ${기준선.소제목}`);
if (통계.하위 < 기준선.하위) 부족.push(`하위 ${통계.하위} < ${기준선.하위}`);
if (통계.링크 < 기준선.링크) 부족.push(`링크 ${통계.링크} < ${기준선.링크}`);

if (부족.length) {
  console.error('색인 추출이 기준선보다 얇다. WOL 구조가 바뀌었는지 확인해야 한다.');
  for (const 줄 of 부족) console.error(`  ${줄}`);
  process.exit(1);
}

writeFileSync(대상, `${JSON.stringify(주제들, null, 2)}\n`, 'utf8');
console.log(`${대상}에 주제 ${Object.keys(주제들).length}개를 저장했다.`);
```

- [ ] **Step 5: npm 스크립트를 등록한다**

`package.json` 의 `scripts` 에서 `"refresh:references"` 줄 바로 아래에 더한다.

```json
"refresh:topics": "node --no-warnings scripts/refresh-service-topics.mjs",
```

- [ ] **Step 6: 매니페스트를 실제로 만든다**

Run: `npm run refresh:topics`
Expected: `소제목 295개, 하위 482개, 링크 2591개를 뽑았다.` 와 저장 메시지가 나오고 종료 코드 0이다. 숫자가 기준선보다 적으면 멈추고 파서를 고친다. 숫자가 더 크면 실물이 늘어난 것이므로 정상이다.

- [ ] **Step 7: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/service-topics.test.mjs`
Expected: PASS 6개.

- [ ] **Step 8: 커밋한다**

```bash
git add src/service-topics.mjs src/service-topics.test.mjs scripts/refresh-service-topics.mjs src/service-topics.json package.json
git commit -m "봉사모임 주제 매니페스트를 생성한다"
```

---

### Task 3: 노션 읽기

**Files:**
- Create: `src/notion-client.mjs`
- Create: `src/notion-client.test.mjs`

**Interfaces:**
- Consumes: 없음.
- Produces:
  - `parseRows(response)` → `[{ id, 순번: number|null, 날짜: string|null, 제목: string }]`. 순번 오름차순이다.
  - `parseBlocks(response)` → `string`. 블록 텍스트를 줄바꿈으로 이었다.
  - `createNotionClient({ token, databaseId, fetchImpl })` → `{ 행목록(), 페이지본문(pageId) }`. 쓰기는 과제 4에서 더한다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/notion-client.test.mjs` 를 만든다. 네트워크를 타지 않고 `fetchImpl` 을 주입한다.

```javascript
// 노션 응답 파싱과 최소 클라이언트 동작을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createNotionClient, parseBlocks, parseRows } from './notion-client.mjs';

const 행응답 = {
  results: [
    {
      id: 'page-b',
      properties: {
        순번: { type: 'number', number: 10 },
        날짜: { type: 'date', date: { start: '2026-07-31' } },
        제목: { type: 'title', title: [{ plain_text: '재방문을 실제로 ' }, { plain_text: '하십시오' }] },
      },
    },
    {
      id: 'page-a',
      properties: {
        순번: { type: 'number', number: 2 },
        날짜: { type: 'date', date: { start: '2026-05-22' } },
        제목: { type: 'title', title: [{ plain_text: '재방문을 위한 토대를 놓으십시오' }] },
      },
    },
    {
      id: 'page-c',
      properties: {
        순번: { type: 'number', number: 11 },
        날짜: { type: 'date', date: null },
        제목: { type: 'title', title: [] },
      },
    },
  ],
  has_more: false,
};

test('행을 순번 오름차순으로 정리한다', () => {
  const 행들 = parseRows(행응답);

  assert.deepEqual(행들.map(행 => 행.순번), [2, 10, 11]);
  assert.equal(행들[1].제목, '재방문을 실제로 하십시오');
  assert.equal(행들[1].날짜, '2026-07-31');
  assert.equal(행들[1].id, 'page-b');
});

test('제목과 날짜가 비어도 빈 값으로 남긴다', () => {
  const 행들 = parseRows(행응답);

  assert.equal(행들[2].제목, '');
  assert.equal(행들[2].날짜, null);
});

test('블록 본문을 줄바꿈으로 이어 붙인다', () => {
  const 본문 = parseBlocks({
    results: [
      { type: 'heading_2', heading_2: { rich_text: [{ plain_text: '오늘의 주제' }] } },
      { type: 'paragraph', paragraph: { rich_text: [{ plain_text: '지난 5월 22일에 우리는' }] } },
      { type: 'to_do', to_do: { rich_text: [{ plain_text: '오늘 다시 방문해 보기' }] } },
      { type: 'image', image: {} },
    ],
  });

  assert.equal(본문, '오늘의 주제\n지난 5월 22일에 우리는\n오늘 다시 방문해 보기');
});

test('행 조회는 데이터베이스 query 를 부르고 토큰을 헤더에 넣는다', async () => {
  const 부른것 = [];
  const client = createNotionClient({
    token: 'secret-x',
    databaseId: 'db-1',
    fetchImpl: async (url, init) => {
      부른것.push({ url, init });
      return { ok: true, status: 200, json: async () => 행응답 };
    },
  });

  const 행들 = await client.행목록();

  assert.equal(행들.length, 3);
  assert.equal(부른것[0].url, 'https://api.notion.com/v1/databases/db-1/query');
  assert.equal(부른것[0].init.method, 'POST');
  assert.equal(부른것[0].init.headers.Authorization, 'Bearer secret-x');
  assert.equal(부른것[0].init.headers['Notion-Version'], '2022-06-28');
});

test('토큰이 없으면 명확히 알리고 멈춘다', async () => {
  const client = createNotionClient({ token: '', databaseId: 'db-1' });

  await assert.rejects(() => client.행목록(), /노션 토큰이 설정되지 않았다/);
});

test('노션 오류는 상태 코드와 함께 알린다', async () => {
  const client = createNotionClient({
    token: 'secret-x',
    databaseId: 'db-1',
    fetchImpl: async () => ({ ok: false, status: 401, text: async () => '{"message":"unauthorized"}' }),
  });

  await assert.rejects(() => client.행목록(), /401/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/notion-client.test.mjs`
Expected: FAIL. `notion-client.mjs` 가 없다.

- [ ] **Step 3: 클라이언트를 구현한다**

`src/notion-client.mjs` 를 만든다. `PATCH` 와 `DELETE` 는 넣지 않는다.

```javascript
// 노션 봉사모임 데이터베이스를 읽고 새 행만 만드는 최소 클라이언트
const 기준 = 'https://api.notion.com/v1';
const 버전 = '2022-06-28';

function 글자(rich) {
  return (rich ?? []).map(조각 => 조각.plain_text ?? '').join('');
}

export function parseRows(response) {
  return (response?.results ?? [])
    .map(row => {
      const p = row.properties ?? {};
      return {
        id: row.id,
        순번: p.순번?.number ?? null,
        날짜: p.날짜?.date?.start ?? null,
        제목: 글자(p.제목?.title),
      };
    })
    .sort((a, b) => (a.순번 ?? Infinity) - (b.순번 ?? Infinity));
}

export function parseBlocks(response) {
  return (response?.results ?? [])
    .map(block => 글자(block[block.type]?.rich_text))
    .filter(Boolean)
    .join('\n');
}

export function createNotionClient({ token, databaseId, fetchImpl = fetch } = {}) {
  async function 호출(경로, init) {
    if (!token) throw new Error('노션 토큰이 설정되지 않았다. .env 의 NOTION_TOKEN 을 확인한다.');
    const response = await fetchImpl(`${기준}${경로}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': 버전,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      const 본문 = await response.text().catch(() => '');
      throw new Error(`노션 요청이 실패했다. HTTP ${response.status} ${본문.slice(0, 200)}`);
    }
    return response.json();
  }

  const client = {
    async 행목록() {
      const 모은행 = [];
      let cursor;
      do {
        const body = cursor ? { start_cursor: cursor, page_size: 100 } : { page_size: 100 };
        const 응답 = await 호출(`/databases/${databaseId}/query`, {
          method: 'POST',
          body: JSON.stringify(body),
        });
        모은행.push(...parseRows(응답));
        cursor = 응답.has_more ? 응답.next_cursor : undefined;
      } while (cursor);
      return 모은행.sort((a, b) => (a.순번 ?? Infinity) - (b.순번 ?? Infinity));
    },

    async 페이지본문(pageId) {
      return parseBlocks(await 호출(`/blocks/${pageId}/children?page_size=100`, { method: 'GET' }));
    },
  };

  return client;
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/notion-client.test.mjs`
Expected: PASS 6개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/notion-client.mjs src/notion-client.test.mjs
git commit -m "노션 봉사모임 행과 본문을 읽는다"
```

---

### Task 4: 노션 쓰기와 중복 거부

**Files:**
- Modify: `src/notion-client.mjs`
- Modify: `src/notion-client.test.mjs`

**Interfaces:**
- Consumes: `createNotionClient`, `parseRows`.
- Produces:
  - `buildPageBody({ databaseId, 순번, 날짜, 제목, 원고 })` → 노션 `POST /v1/pages` 요청 객체.
  - `client.행생성({ 순번, 날짜, 제목, 원고 })` → `{ id, url }`. 저장 직전에 `행목록()` 을 다시 읽어 같은 순번 또는 같은 날짜가 있으면 만들지 않고 던진다.

`원고` 의 모양은 이렇다. 과제 7의 `buildDraft` 가 이 모양을 돌려준다.

```javascript
{
  주제: string,
  들어가는말: string,
  성구주소: string,
  성구본문: string,
  핵심생각: string[],
  대화시연: [{ 역할: string, 말: string }],
  실천제안: string[],
  마무리격려: string,
  경고: string | undefined,
  출처: [{ 제목: string, url: string, 조회일: string }],
}
```

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/notion-client.test.mjs` 의 import 에 `buildPageBody` 를 더하고 파일 끝에 더한다.

```javascript
const 원고 = {
  주제: '관심이 자라게 함',
  들어가는말: '지난 7월 31일에 우리는 「재방문을 실제로 하십시오」를 살펴보았습니다.',
  성구주소: '고린도전서 3:6',
  성구본문: '나는 심었고 아볼로는 물을 주었지만, 자라게 하신 분은 하느님이십니다.',
  핵심생각: ['관심은 한 번에 자라지 않습니다.'],
  대화시연: [{ 역할: '집주인', 말: '바쁩니다.' }, { 역할: '형제', 말: '잠깐이면 됩니다.' }],
  실천제안: ['이번 주에 한 집을 다시 찾아가기'],
  마무리격려: '자라게 하시는 분은 여호와이십니다.',
  출처: [{ 제목: '관심이 자라게 하려면', url: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2019447#h=11:0-15:0', 조회일: '2026-08-21' }],
};

test('노션 페이지 본문에 속성과 체크박스를 만든다', () => {
  const body = buildPageBody({ databaseId: 'db-1', 순번: 12, 날짜: '2026-08-28', 제목: '관심이 자라게 함', 원고 });

  assert.equal(body.parent.database_id, 'db-1');
  assert.equal(body.properties.순번.number, 12);
  assert.equal(body.properties.날짜.date.start, '2026-08-28');
  assert.equal(body.properties.제목.title[0].text.content, '관심이 자라게 함');

  const 체크 = body.children.filter(block => block.type === 'to_do');
  assert.equal(체크.length, 1);
  assert.equal(체크[0].to_do.rich_text[0].text.content, '이번 주에 한 집을 다시 찾아가기');

  const 전체 = JSON.stringify(body);
  assert.ok(전체.includes('고린도전서 3:6'));
  assert.ok(전체.includes('나는 심었고'));
  assert.ok(전체.includes('집주인'));
  assert.ok(전체.includes('2026-08-21'));
});

test('성구 확인에 실패한 원고는 그 사실을 본문에 남긴다', () => {
  const body = buildPageBody({
    databaseId: 'db-1',
    순번: 12,
    날짜: '2026-08-28',
    제목: '관심이 자라게 함',
    원고: { ...원고, 성구주소: '', 성구본문: '' },
  });

  assert.ok(JSON.stringify(body).includes('성구 자동 확인 실패'));
});

test('같은 순번이 이미 있으면 만들지 않는다', async () => {
  const client = createNotionClient({
    token: 'secret-x',
    databaseId: 'db-1',
    fetchImpl: async (url, init) => {
      if (url.endsWith('/query')) return { ok: true, status: 200, json: async () => 행응답 };
      throw new Error('페이지를 만들면 안 된다');
    },
  });

  await assert.rejects(
    () => client.행생성({ 순번: 10, 날짜: '2026-08-28', 제목: '관심이 자라게 함', 원고 }),
    /순번 10/,
  );
});

test('같은 날짜가 이미 있으면 만들지 않는다', async () => {
  const client = createNotionClient({
    token: 'secret-x',
    databaseId: 'db-1',
    fetchImpl: async (url) => {
      if (url.endsWith('/query')) return { ok: true, status: 200, json: async () => 행응답 };
      throw new Error('페이지를 만들면 안 된다');
    },
  });

  await assert.rejects(
    () => client.행생성({ 순번: 12, 날짜: '2026-07-31', 제목: '관심이 자라게 함', 원고 }),
    /2026-07-31/,
  );
});

test('중복이 없으면 페이지를 만든다', async () => {
  const 부른것 = [];
  const client = createNotionClient({
    token: 'secret-x',
    databaseId: 'db-1',
    fetchImpl: async (url) => {
      부른것.push(url);
      if (url.endsWith('/query')) return { ok: true, status: 200, json: async () => 행응답 };
      return { ok: true, status: 200, json: async () => ({ id: 'new-page', url: 'https://notion.so/new-page' }) };
    },
  });

  const 결과 = await client.행생성({ 순번: 12, 날짜: '2026-08-28', 제목: '관심이 자라게 함', 원고 });

  assert.equal(결과.id, 'new-page');
  assert.ok(부른것.includes('https://api.notion.com/v1/pages'));
});

test('클라이언트에 수정과 삭제 경로가 없다', () => {
  const client = createNotionClient({ token: 'secret-x', databaseId: 'db-1' });
  assert.deepEqual(Object.keys(client).sort(), ['페이지본문', '행목록', '행생성'].sort());
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/notion-client.test.mjs`
Expected: FAIL. `buildPageBody` 와 `행생성` 이 없다.

- [ ] **Step 3: 블록 생성기를 더한다**

`src/notion-client.mjs` 의 `parseBlocks` 아래에 더한다.

```javascript
function 글월(content) {
  return [{ type: 'text', text: { content: String(content).slice(0, 2000) } }];
}

function 제목블록(text) {
  return { object: 'block', type: 'heading_2', heading_2: { rich_text: 글월(text) } };
}

function 문단블록(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: 글월(text) } };
}

function 목록블록(text) {
  return { object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: 글월(text) } };
}

function 할일블록(text) {
  return { object: 'block', type: 'to_do', to_do: { rich_text: 글월(text), checked: false } };
}

export function buildPageBody({ databaseId, 순번, 날짜, 제목, 원고 }) {
  const children = [
    제목블록('오늘의 주제'),
    문단블록(원고.주제),
    제목블록('들어가는 말'),
    문단블록(원고.들어가는말),
    제목블록('성구 근거'),
  ];

  if (원고.성구주소 && 원고.성구본문) {
    children.push(문단블록(`${원고.성구주소} — ${원고.성구본문}`));
  } else {
    children.push(문단블록('성구 자동 확인 실패. 직접 확인이 필요하다.'));
  }

  children.push(제목블록('핵심 생각'));
  for (const 줄 of 원고.핵심생각 ?? []) children.push(목록블록(줄));

  children.push(제목블록('오늘의 대화 시연'));
  for (const 마디 of 원고.대화시연 ?? []) children.push(목록블록(`${마디.역할}: ${마디.말}`));

  children.push(제목블록('오늘 실천할 제안'));
  for (const 줄 of 원고.실천제안 ?? []) children.push(할일블록(줄));

  children.push(제목블록('마무리 격려'));
  children.push(문단블록(원고.마무리격려));

  if (원고.출처?.length) {
    children.push(제목블록('출처'));
    for (const 출처 of 원고.출처) {
      children.push(목록블록(`${출처.제목} ${출처.url} (조회일 ${출처.조회일})`));
    }
  }

  return {
    parent: { database_id: databaseId },
    properties: {
      순번: { number: 순번 },
      날짜: { date: { start: 날짜 } },
      제목: { title: [{ type: 'text', text: { content: 제목 } }] },
    },
    children: children.slice(0, 100),
  };
}
```

- [ ] **Step 4: `행생성` 을 더한다**

`createNotionClient` 안의 `client` 객체에 `페이지본문` 다음으로 더한다.

```javascript
    async 행생성({ 순번, 날짜, 제목, 원고 }) {
      const 기존 = await client.행목록();
      if (기존.some(행 => 행.순번 === 순번)) {
        throw new Error(`순번 ${순번}이 이미 있다. 노션을 확인하고 순번을 바꾼다.`);
      }
      if (기존.some(행 => 행.날짜 === 날짜)) {
        throw new Error(`날짜 ${날짜}에 이미 행이 있다. 노션을 확인하고 날짜를 바꾼다.`);
      }
      const 결과 = await 호출('/pages', {
        method: 'POST',
        body: JSON.stringify(buildPageBody({ databaseId, 순번, 날짜, 제목, 원고 })),
      });
      return { id: 결과.id, url: 결과.url };
    },
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/notion-client.test.mjs`
Expected: PASS 12개.

- [ ] **Step 6: 커밋한다**

```bash
git add src/notion-client.mjs src/notion-client.test.mjs
git commit -m "노션에 봉사모임 새 행만 안전하게 만든다"
```

---

### Task 5: 최소 OpenAI 호출

**Files:**
- Create: `src/openai-text.mjs`
- Create: `src/openai-text.test.mjs`

**Interfaces:**
- Consumes: 없음.
- Produces: `requestStructured({ 지침, 입력, 스키마이름, 스키마 }, options)` → 파싱된 객체. `options` 는 `{ apiKey, model, fetchImpl, timeoutMs }` 다. 키가 없으면 `null` 을 돌려준다. 호출이나 파싱이 실패하면 던진다.

이 파일이 `src/ai-answer.mjs` 와 중복되는 이유는 스펙 3절에 있다. 답변 배열 전용 함수를 자유 형식 원고에 쓸 수 없고, 공용 헬퍼 추출은 15개 답변 생성이라는 검증된 운영 경로를 건드린다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/openai-text.test.mjs` 를 만든다.

```javascript
// 자유 형식 구조화 출력 전용 OpenAI 호출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requestStructured } from './openai-text.mjs';

const 스키마 = { type: 'object', properties: { 주제: { type: 'string' } }, required: ['주제'], additionalProperties: false };

test('키가 없으면 호출하지 않고 null 을 돌려준다', async () => {
  let 불렀나 = false;
  const 결과 = await requestStructured(
    { 지침: 'x', 입력: 'y', 스키마이름: '원고', 스키마 },
    { apiKey: '', fetchImpl: async () => { 불렀나 = true; } },
  );

  assert.equal(결과, null);
  assert.equal(불렀나, false);
});

test('출력 텍스트를 JSON 으로 파싱해 돌려준다', async () => {
  const 결과 = await requestStructured(
    { 지침: '한국어로 답한다', 입력: '주제를 고른다', 스키마이름: '원고', 스키마 },
    {
      apiKey: 'sk-x',
      model: 'gpt-5.4-mini',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{"주제":"관심이 자라게 함"}' }] }] }),
      }),
    },
  );

  assert.deepEqual(결과, { 주제: '관심이 자라게 함' });
});

test('요청에 모델과 스키마와 키를 담는다', async () => {
  let 본것;
  await requestStructured(
    { 지침: 'g', 입력: 'i', 스키마이름: '원고', 스키마 },
    {
      apiKey: 'sk-x',
      model: 'gpt-5.4-mini',
      fetchImpl: async (url, init) => {
        본것 = { url, init, body: JSON.parse(init.body) };
        return { ok: true, status: 200, json: async () => ({ output_text: '{"주제":"a"}' }) };
      },
    },
  );

  assert.equal(본것.url, 'https://api.openai.com/v1/responses');
  assert.equal(본것.init.headers.Authorization, 'Bearer sk-x');
  assert.equal(본것.body.model, 'gpt-5.4-mini');
  assert.equal(본것.body.text.format.name, '원고');
});

test('HTTP 오류는 상태 코드와 함께 던진다', async () => {
  await assert.rejects(
    () => requestStructured(
      { 지침: 'g', 입력: 'i', 스키마이름: '원고', 스키마 },
      { apiKey: 'sk-x', fetchImpl: async () => ({ ok: false, status: 429, text: async () => 'rate limit' }) },
    ),
    /429/,
  );
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/openai-text.test.mjs`
Expected: FAIL. `openai-text.mjs` 가 없다.

- [ ] **Step 3: 구현한다**

`src/openai-text.mjs` 를 만든다.

```javascript
// 자유 형식 원고 생성을 위한 최소 OpenAI Responses 호출
const 주소 = 'https://api.openai.com/v1/responses';
const 기본모델 = 'gpt-5.4-mini';

function 출력텍스트(response) {
  if (typeof response?.output_text === 'string' && response.output_text) return response.output_text;
  const 조각들 = [];
  for (const 항목 of response?.output ?? []) {
    for (const 내용 of 항목?.content ?? []) {
      if (내용?.type === 'output_text' && 내용.text) 조각들.push(내용.text);
    }
  }
  return 조각들.join('');
}

export async function requestStructured({ 지침, 입력, 스키마이름, 스키마 }, options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) return null;

  const model = options.model ?? process.env.OPENAI_MODEL ?? 기본모델;
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 120000;

  const response = await fetchImpl(주소, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(timeoutMs),
    body: JSON.stringify({
      model,
      reasoning: { effort: 'low' },
      input: [
        { role: 'system', content: 지침 },
        { role: 'user', content: 입력 },
      ],
      text: { format: { type: 'json_schema', name: 스키마이름, schema: 스키마, strict: true } },
    }),
  });

  if (!response.ok) {
    const 본문 = await response.text().catch(() => '');
    throw new Error(`OpenAI 요청이 실패했다. HTTP ${response.status} ${본문.slice(0, 200)}`);
  }

  const 텍스트 = 출력텍스트(await response.json());
  if (!텍스트) throw new Error('OpenAI 응답에 출력 텍스트가 없다.');
  return JSON.parse(텍스트);
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/openai-text.test.mjs`
Expected: PASS 4개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/openai-text.mjs src/openai-text.test.mjs
git commit -m "자유 형식 구조화 출력 호출을 더한다"
```

---

### Task 6: 후보 선정

**Files:**
- Create: `src/service-meeting.mjs`
- Create: `src/service-meeting.test.mjs`

**Interfaces:**
- Consumes: `requestStructured`.
- Produces:
  - `다음순번(행들)` → `number`. 최댓값 더하기 1이며 행이 없으면 1이다.
  - `다음금요일(오늘)` → `'YYYY-MM-DD'`. 오늘이 금요일이면 다음 주 금요일이다.
  - `직전완성글(행들)` → 제목이 빈 행을 제외한 마지막 행 또는 `null`.
  - `규칙후보(주제들, 과거제목들, 개수)` → `[{ 라벨, 상위, 이유, 참고 }]`.
  - `유효후보만(후보들, 주제들)` → 매니페스트에 있는 라벨만 남긴 배열.
  - `buildCandidates({ client, 주제들, 오늘, ai })` → `{ 다음순번, 다음날짜, 직전글, 후보들, 생성방식 }`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/service-meeting.test.mjs` 를 만든다.

```javascript
// 봉사모임 후보 선정과 날짜 계산을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCandidates, 규칙후보, 다음금요일, 다음순번, 유효후보만, 직전완성글 } from './service-meeting.mjs';

const 행들 = [
  { id: 'a', 순번: 2, 날짜: '2026-05-22', 제목: '재방문을 위한 토대를 놓으십시오' },
  { id: 'b', 순번: 10, 날짜: '2026-07-31', 제목: '재방문을 실제로 하십시오' },
  { id: 'c', 순번: 11, 날짜: '2026-08-01', 제목: '' },
];

const 주제들 = {
  '재방문': { 상위: null, 참고: [{ 표시: '파19.07 15-16', pc: '/ko/wol/pc/a/0/0' }] },
  '관심이 자라게 함': { 상위: null, 참고: [{ 표시: '파19.07 15-16', pc: '/ko/wol/pc/a/1/0' }, { 표시: '파16.08 27-28', pc: '/ko/wol/pc/a/1/2' }] },
  '귀 기울이는 사람': { 상위: null, 참고: [{ 표시: '그리성 105-106', pc: '/ko/wol/pc/a/2/0' }] },
  '봉사 도구함 사용': { 상위: null, 참고: [] },
};

test('다음 순번은 제목이 빈 행도 세어 최댓값 더하기 1이다', () => {
  assert.equal(다음순번(행들), 12);
  assert.equal(다음순번([]), 1);
});

test('다음 금요일을 고른다. 오늘이 금요일이면 다음 주다', () => {
  assert.equal(다음금요일(new Date('2026-08-19T00:00:00Z')), '2026-08-21');
  assert.equal(다음금요일(new Date('2026-08-21T00:00:00Z')), '2026-08-28');
});

test('직전 완성 글은 제목이 빈 행을 건너뛴다', () => {
  assert.equal(직전완성글(행들).제목, '재방문을 실제로 하십시오');
  assert.equal(직전완성글([{ id: 'x', 순번: 1, 날짜: null, 제목: '' }]), null);
});

test('규칙 후보는 과거 제목과 겹치지 않는 주제를 참고가 많은 순으로 고른다', () => {
  const 후보들 = 규칙후보(주제들, ['재방문을 실제로 하십시오', '재방문을 위한 토대를 놓으십시오'], 3);

  assert.equal(후보들.length, 3);
  assert.ok(!후보들.some(후보 => 후보.라벨 === '재방문'));
  assert.equal(후보들[0].라벨, '관심이 자라게 함');
  assert.match(후보들[0].이유, /자동 선정/);
});

test('매니페스트에 없는 라벨은 후보에서 버린다', () => {
  const 남은것 = 유효후보만(
    [{ 라벨: '관심이 자라게 함', 이유: 'ㄱ' }, { 라벨: '없는 주제', 이유: 'ㄴ' }],
    주제들,
  );

  assert.equal(남은것.length, 1);
  assert.equal(남은것[0].라벨, '관심이 자라게 함');
  assert.deepEqual(남은것[0].참고, 주제들['관심이 자라게 함'].참고);
});

test('AI 가 없으면 규칙 후보를 돌려주고 생성방식을 밝힌다', async () => {
  const client = { 행목록: async () => 행들, 페이지본문: async () => '지난 5월 22일에 우리는' };
  const 결과 = await buildCandidates({ client, 주제들, 오늘: new Date('2026-08-21T00:00:00Z'), ai: async () => null });

  assert.equal(결과.생성방식, 'rule');
  assert.equal(결과.다음순번, 12);
  assert.equal(결과.다음날짜, '2026-08-28');
  assert.equal(결과.직전글.제목, '재방문을 실제로 하십시오');
  assert.equal(결과.후보들.length, 3);
});

test('AI 후보 중 매니페스트에 있는 것만 통과시킨다', async () => {
  const client = { 행목록: async () => 행들, 페이지본문: async () => '' };
  const 결과 = await buildCandidates({
    client,
    주제들,
    오늘: new Date('2026-08-21T00:00:00Z'),
    ai: async () => ({ 후보들: [
      { 라벨: '귀 기울이는 사람', 이유: '경청이 다음 단계다.' },
      { 라벨: '지어낸 주제', 이유: '없는 것이다.' },
    ] }),
  });

  assert.equal(결과.생성방식, 'ai');
  assert.equal(결과.후보들.length, 1);
  assert.equal(결과.후보들[0].라벨, '귀 기울이는 사람');
});

test('AI 후보가 모두 무효면 규칙 후보로 되돌린다', async () => {
  const client = { 행목록: async () => 행들, 페이지본문: async () => '' };
  const 결과 = await buildCandidates({
    client,
    주제들,
    오늘: new Date('2026-08-21T00:00:00Z'),
    ai: async () => ({ 후보들: [{ 라벨: '전부 지어낸 것', 이유: 'x' }] }),
  });

  assert.equal(결과.생성방식, 'rule');
  assert.ok(결과.후보들.length > 0);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-meeting.test.mjs`
Expected: FAIL. `service-meeting.mjs` 가 없다.

- [ ] **Step 3: 구현한다**

`src/service-meeting.mjs` 를 만든다.

```javascript
// 노션 봉사모임 흐름을 읽어 다음 주제 후보와 원고를 만드는 조립기
import { requestStructured } from './openai-text.mjs';

const 후보스키마 = {
  type: 'object',
  properties: {
    후보들: {
      type: 'array',
      items: {
        type: 'object',
        properties: { 라벨: { type: 'string' }, 이유: { type: 'string' } },
        required: ['라벨', '이유'],
        additionalProperties: false,
      },
    },
  },
  required: ['후보들'],
  additionalProperties: false,
};

export function 다음순번(행들) {
  const 번호들 = 행들.map(행 => 행.순번).filter(값 => typeof 값 === 'number');
  return 번호들.length ? Math.max(...번호들) + 1 : 1;
}

export function 다음금요일(오늘) {
  const d = new Date(오늘.getTime());
  const 남은 = (5 - d.getUTCDay() + 7) % 7 || 7;
  d.setUTCDate(d.getUTCDate() + 남은);
  return d.toISOString().slice(0, 10);
}

export function 직전완성글(행들) {
  const 완성 = 행들.filter(행 => 행.제목?.trim());
  return 완성.length ? 완성[완성.length - 1] : null;
}

function 낱말들(문장) {
  return String(문장)
    .split(/[\s,·—-]+/)
    .map(낱말 => 낱말.replace(/[^가-힣a-zA-Z]/g, ''))
    .filter(낱말 => 낱말.length >= 2);
}

function 최근성(참고) {
  return 참고.some(항목 => /(파|집교|사)\s?(1[5-9]|2\d)/.test(항목.표시)) ? 1 : 0;
}

export function 규칙후보(주제들, 과거제목들, 개수 = 3) {
  // 한국어는 조사가 붙으므로 낱말 완전 일치로 대조하면 안 된다.
  // 라벨 「재방문」과 과거 제목의 「재방문을」이 서로 다른 낱말로 잡혀 이미 다룬 주제가 다시 올라온다.
  // 그래서 조사를 떼지 않고 과거 제목 전체에서 부분 문자열로 찾는다.
  const 과거텍스트 = 과거제목들.join(' ').replace(/[^가-힣a-zA-Z]/g, '');
  return Object.entries(주제들)
    .filter(([라벨]) => !낱말들(라벨).some(낱말 => 과거텍스트.includes(낱말)))
    .sort(([, a], [, b]) => 최근성(b.참고) - 최근성(a.참고) || b.참고.length - a.참고.length)
    .slice(0, 개수)
    .map(([라벨, 주제]) => ({
      라벨,
      상위: 주제.상위,
      이유: '자동 선정 — 아직 다루지 않은 주제임.',
      참고: 주제.참고,
    }));
}

export function 유효후보만(후보들, 주제들) {
  return (후보들 ?? [])
    .filter(후보 => 주제들[후보.라벨])
    .map(후보 => ({
      라벨: 후보.라벨,
      상위: 주제들[후보.라벨].상위,
      이유: 후보.이유,
      참고: 주제들[후보.라벨].참고,
    }));
}

async function ai후보(주제들, 과거제목들, 직전본문, ai) {
  const 라벨목록 = Object.keys(주제들).join('\n');
  const 결과 = await ai({
    지침: [
      '너는 여호와의 증인 회중의 봉사모임 원고를 준비하는 보조자다.',
      '주어진 공식 주제 목록에 실제로 있는 라벨만 고른다. 새 주제를 지어내지 않는다.',
      '과거에 다룬 주제의 다음 단계가 되는 것을 우선한다.',
      '한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.',
    ].join(' '),
    입력: [
      `지금까지 다룬 제목\n${과거제목들.join('\n') || '없음'}`,
      `직전 글 본문\n${직전본문.slice(0, 1500) || '없음'}`,
      `고를 수 있는 공식 주제 라벨\n${라벨목록}`,
      '위 라벨 중 다음에 다루기 좋은 3개를 고르고 각각 왜 그다음인지 한 문장으로 밝힌다.',
    ].join('\n\n'),
    스키마이름: '봉사모임후보',
    스키마: 후보스키마,
  });
  return 결과?.후보들 ?? null;
}

export async function buildCandidates({ client, 주제들, 오늘 = new Date(), ai = null }) {
  const 행들 = await client.행목록();
  const 직전 = 직전완성글(행들);
  const 직전본문 = 직전 ? await client.페이지본문(직전.id).catch(() => '') : '';
  const 과거제목들 = 행들.map(행 => 행.제목).filter(제목 => 제목?.trim());

  const 호출 = ai ?? (인자 => requestStructured(인자));
  let 후보들 = [];
  let 생성방식 = 'rule';
  try {
    후보들 = 유효후보만(await ai후보(주제들, 과거제목들, 직전본문, 호출), 주제들);
    if (후보들.length) 생성방식 = 'ai';
  } catch {
    후보들 = [];
  }
  if (!후보들.length) {
    후보들 = 규칙후보(주제들, 과거제목들, 3);
    생성방식 = 'rule';
  }

  return {
    다음순번: 다음순번(행들),
    다음날짜: 다음금요일(오늘),
    직전글: 직전 ? { 제목: 직전.제목, 날짜: 직전.날짜, 요약: 직전본문.slice(0, 800) } : null,
    후보들,
    생성방식,
  };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/service-meeting.test.mjs`
Expected: PASS 8개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/service-meeting.mjs src/service-meeting.test.mjs
git commit -m "봉사모임 다음 주제 후보를 제시한다"
```

---

### Task 7: 원고 생성과 성구 검증

**Files:**
- Modify: `src/service-meeting.mjs`
- Modify: `src/service-meeting.test.mjs`

**Interfaces:**
- Consumes: `parseReference`, `createTextReader`, `resolveRedirect`, `fetchCached`, `parsePublicationDocument`, `selectPublicationContent`, `requestStructured`.
- Produces:
  - `한국어만(text)` → 한국어 이외의 문자 체계를 지운 문자열.
  - `원고정규화(원고)` → 모든 글자 항목에 `한국어만` 을 적용한 원고 사본.
  - `성구채우기(원고, 도구)` → 원고 사본. `도구` 는 `{ index, text }` 이며 `text.verse(book, chapter, verse)` 를 갖는다. 주소가 유효하면 `성구본문` 을 로컬 본문으로 채우고, 아니면 `성구주소` 와 `성구본문` 을 빈 문자열로 만들고 `경고` 를 담는다.
  - `근거모으기(참고들, 옵션)` → `Promise<[{ 표시, 제목, url, 조회일, 본문 }]>`. 실패한 링크는 `본문` 과 `url` 이 빈 문자열이다.
  - `buildDraft({ 주제, 직전글, 근거들, 도구, ai })` → `{ 원고, 생성방식 }`. `생성방식` 은 `'ai'` 또는 `'fallback'` 이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/service-meeting.test.mjs` 끝에 더한다.

```javascript
import { existsSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { buildDraft, 근거모으기, 성구채우기 } from './service-meeting.mjs';

const 코어없음 = !existsSync('core/bible/index.json') || !existsSync('core/bible/text');

function 도구() {
  const index = loadIndex();
  return { index, text: createTextReader(index) };
}

test('유효한 성구 주소는 로컬 본문으로 채운다', { skip: 코어없음 }, () => {
  const 채운것 = 성구채우기({ 성구주소: '마태복음 24:14', 성구본문: '모델이 지어낸 문장이다' }, 도구());
  const 실제 = 도구().text.verse(40, 24, 14);

  assert.equal(채운것.성구본문, 실제);
  assert.notEqual(채운것.성구본문, '모델이 지어낸 문장이다');
  assert.equal(채운것.경고, undefined);
});

test('잘못된 성구 주소는 거절하고 경고를 남긴다', { skip: 코어없음 }, () => {
  const 채운것 = 성구채우기({ 성구주소: '없는책 3:6', 성구본문: '모델이 지어낸 문장이다' }, 도구());

  assert.equal(채운것.성구주소, '');
  assert.equal(채운것.성구본문, '');
  assert.match(채운것.경고, /성구 자동 확인 실패/);
});

test('범위나 빈 주소도 거절한다', { skip: 코어없음 }, () => {
  assert.equal(성구채우기({ 성구주소: '마태복음 24:14-16', 성구본문: 'x' }, 도구()).성구본문, '');
  assert.equal(성구채우기({ 성구주소: '', 성구본문: 'x' }, 도구()).성구본문, '');
});

test('참고 링크 해석이 실패해도 나머지 근거로 진행한다', async () => {
  const 결과 = await 근거모으기(
    [{ 표시: '파19.07 15-16', pc: '/ko/wol/pc/a/1/0' }, { 표시: '파16.08 27-28', pc: '/ko/wol/pc/a/1/2' }],
    {
      조회일: '2026-08-21',
      resolveImpl: async pc => {
        if (pc.endsWith('/1/2')) throw new Error('연결 문서를 찾지 못했다.');
        return 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2019447#h=11:0-15:0';
      },
      문서읽기: async () => ({ 제목: '관심이 자라게 하려면', 본문: '관심은 한 번에 자라지 않는다.' }),
    },
  );

  assert.equal(결과.length, 2);
  assert.equal(결과[0].본문, '관심은 한 번에 자라지 않는다.');
  assert.equal(결과[1].본문, '');
  assert.equal(결과[0].조회일, '2026-08-21');
});

test('AI 가 없으면 근거로 결정론적 초안을 만든다', { skip: 코어없음 }, async () => {
  const { 원고, 생성방식 } = await buildDraft({
    주제: { 라벨: '관심이 자라게 함', 참고: [] },
    직전글: { 제목: '재방문을 실제로 하십시오', 날짜: '2026-07-31', 요약: '' },
    근거들: [{ 표시: '파19.07 15-16', 제목: '관심이 자라게 하려면', url: 'https://wol.jw.org/x', 조회일: '2026-08-21', 본문: '관심은 한 번에 자라지 않는다.' }],
    도구: 도구(),
    ai: async () => null,
  });

  assert.equal(생성방식, 'fallback');
  assert.equal(원고.주제, '관심이 자라게 함');
  assert.match(원고.들어가는말, /재방문을 실제로 하십시오/);
  assert.equal(원고.출처[0].조회일, '2026-08-21');
});

test('근거가 하나도 없으면 근거 미확인을 밝힌다', { skip: 코어없음 }, async () => {
  const { 원고 } = await buildDraft({
    주제: { 라벨: '관심이 자라게 함', 참고: [] },
    직전글: null,
    근거들: [],
    도구: 도구(),
    ai: async () => null,
  });

  assert.match(원고.핵심생각.join(' '), /출판물 근거 미확인 — 내 정리임\./);
});

test('AI 원고의 성구 문장은 그대로 쓰지 않는다', { skip: 코어없음 }, async () => {
  const { 원고, 생성방식 } = await buildDraft({
    주제: { 라벨: '관심이 자라게 함', 참고: [] },
    직전글: { 제목: '재방문을 실제로 하십시오', 날짜: '2026-07-31', 요약: '' },
    근거들: [],
    도구: 도구(),
    ai: async () => ({
      주제: '관심이 자라게 함',
      들어가는말: '지난 7월 31일에 우리는 「재방문을 실제로 하십시오」를 살펴보았습니다.',
      성구주소: '마태복음 24:14',
      성구본문: '모델이 지어낸 성구 문장이다',
      핵심생각: ['관심은 한 번에 자라지 않습니다.'],
      대화시연: [{ 역할: '집주인', 말: '바쁩니다.' }],
      실천제안: ['한 집을 다시 찾아가기'],
      마무리격려: '자라게 하시는 분은 여호와이십니다.',
    }),
  });

  assert.equal(생성방식, 'ai');
  assert.equal(원고.성구본문, 도구().text.verse(40, 24, 14));
  assert.notEqual(원고.성구본문, '모델이 지어낸 성구 문장이다');
});

test('한국어 이외의 문자 체계는 원고에서 제거한다', { skip: 코어없음 }, async () => {
  const { 원고 } = await buildDraft({
    주제: { 라벨: '관심이 자라게 함', 참고: [] },
    직전글: null,
    근거들: [],
    도구: 도구(),
    ai: async () => ({
      주제: '관심이 자라게 함',
      들어가는말: '오늘은 न्याय 를 생각해 봅니다.',
      성구주소: '마태복음 24:14',
      핵심생각: ['관심은 天 한 번에 자라지 않습니다.'],
      대화시연: [{ 역할: '집주인', 말: 'бы 바쁩니다.' }],
      실천제안: ['한 집을 다시 찾아가기'],
      마무리격려: '자라게 하시는 분은 여호와이십니다.',
    }),
  });

  const 전체 = JSON.stringify(원고);
  assert.ok(!/[\u0900-\u097F\u4E00-\u9FFF\u0400-\u04FF]/.test(전체), `한국어 이외 문자가 남았다: ${전체}`);
  assert.match(원고.들어가는말, /오늘은/);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-meeting.test.mjs`
Expected: FAIL. `성구채우기`, `근거모으기`, `buildDraft` 가 없다.

- [ ] **Step 3: 구현한다**

`src/service-meeting.mjs` 의 import 에 더한다.

```javascript
import { parseReference } from './verse-address.mjs';
import { fetchCached, resolveRedirect } from './wol-fetch.mjs';
import { parsePublicationDocument, selectPublicationContent } from './publication-reference.mjs';
```

같은 파일 끝에 더한다. 원고 스키마에 `성구본문` 을 넣지 않는 것이 핵심이다. 모델이 성구 문장을 쓸 자리를 아예 주지 않는다.

```javascript
const 원고스키마 = {
  type: 'object',
  properties: {
    주제: { type: 'string' },
    들어가는말: { type: 'string' },
    성구주소: { type: 'string' },
    핵심생각: { type: 'array', items: { type: 'string' } },
    대화시연: {
      type: 'array',
      items: {
        type: 'object',
        properties: { 역할: { type: 'string' }, 말: { type: 'string' } },
        required: ['역할', '말'],
        additionalProperties: false,
      },
    },
    실천제안: { type: 'array', items: { type: 'string' } },
    마무리격려: { type: 'string' },
  },
  required: ['주제', '들어가는말', '성구주소', '핵심생각', '대화시연', '실천제안', '마무리격려'],
  additionalProperties: false,
};

// 인수인계 문서에 힌디어가 한 번 새어 나온 기록이 있다. 프롬프트 지침만으로 막지 않고 출력에서도 지운다.
const 허용문자 = /[^가-힣ㄱ-ㅎㅏ-ㅣ0-9A-Za-z\s.,!?~%()「」『』·:;'"“”‘’\-–—\/]/g;

export function 한국어만(text) {
  return String(text).replace(허용문자, '').replace(/\s{2,}/g, ' ').trim();
}

export function 원고정규화(원고) {
  return {
    ...원고,
    주제: 한국어만(원고.주제 ?? ''),
    들어가는말: 한국어만(원고.들어가는말 ?? ''),
    핵심생각: (원고.핵심생각 ?? []).map(한국어만),
    대화시연: (원고.대화시연 ?? []).map(마디 => ({ 역할: 한국어만(마디.역할), 말: 한국어만(마디.말) })),
    실천제안: (원고.실천제안 ?? []).map(한국어만),
    마무리격려: 한국어만(원고.마무리격려 ?? ''),
  };
}

export function 성구채우기(원고, 도구) {
  const 사본 = { ...원고 };
  try {
    const { book, chapter, verse } = parseReference(도구.index, 사본.성구주소 ?? '');
    const 본문 = 도구.text.verse(book, chapter, verse);
    if (!본문) throw new Error('본문이 비어 있다');
    사본.성구본문 = 본문;
    delete 사본.경고;
  } catch {
    사본.성구주소 = '';
    사본.성구본문 = '';
    사본.경고 = '성구 자동 확인 실패. 직접 확인이 필요하다.';
  }
  return 사본;
}

export async function 근거모으기(참고들, options = {}) {
  const 조회일 = options.조회일 ?? new Date().toISOString().slice(0, 10);
  const resolveImpl = options.resolveImpl ?? (pc => resolveRedirect(new URL(pc, 'https://wol.jw.org').href));
  const 문서읽기 = options.문서읽기 ?? (async (url, 표시) => {
    const 본문URL = url.split('#')[0];
    const docId = 본문URL.split('/').pop();
    const html = await fetchCached(본문URL, `doc-${docId}.html`);
    const document = parsePublicationDocument(html);
    const 선택 = selectPublicationContent(document, 표시, 표시, url);
    return { 제목: document.제목, 본문: 선택.본문 };
  });

  const 결과 = [];
  for (const 참고 of (참고들 ?? []).slice(0, 4)) {
    try {
      const url = await resolveImpl(참고.pc);
      const { 제목, 본문 } = await 문서읽기(url, 참고.표시);
      결과.push({ 표시: 참고.표시, 제목, url, 조회일, 본문 });
    } catch {
      결과.push({ 표시: 참고.표시, 제목: 참고.표시, url: '', 조회일, 본문: '' });
    }
  }
  return 결과;
}

function 폴백원고(주제, 직전글, 근거들) {
  const 있는근거 = 근거들.filter(근거 => 근거.본문);
  const 들어가는말 = 직전글
    ? `지난 ${직전글.날짜}에 우리는 「${직전글.제목}」을 함께 살펴보았습니다. 오늘은 그와 이어지는 「${주제.라벨}」을 생각해 봅니다.`
    : `오늘은 「${주제.라벨}」을 함께 생각해 봅니다.`;
  const 핵심생각 = 있는근거.length
    ? 있는근거.map(근거 => 근거.본문.split(/(?<=\.)\s/)[0])
    : ['출판물 근거 미확인 — 내 정리임.'];
  return {
    주제: 주제.라벨,
    들어가는말,
    성구주소: '',
    핵심생각,
    대화시연: [],
    실천제안: [`이번 주 봉사에서 「${주제.라벨}」을 한 번 적용해 보기`],
    마무리격려: '오늘 뿌리는 작은 수고를 여호와께서 축복하십니다.',
  };
}

export async function buildDraft({ 주제, 직전글, 근거들, 도구, ai = null }) {
  const 호출 = ai ?? (인자 => requestStructured(인자));
  let 결과 = null;
  try {
    결과 = await 호출({
      지침: [
        '너는 여호와의 증인 회중의 봉사모임 원고를 준비하는 보조자다.',
        '여호와의 증인의 이해를 기준으로 삼고 독자적인 새 교리를 만들지 않는다.',
        '주어진 출판물 본문 안에서만 설명한다. 근거가 없으면 그렇게 밝힌다.',
        '성구는 주소만 쓴다. 성구 문장을 직접 쓰지 않는다. 한 절만 고른다.',
        '한국어로만 쓴다. 한국어 문장은 마침표로 끝내고 문장 끝에 콜론을 쓰지 않는다.',
      ].join(' '),
      입력: [
        `오늘의 주제\n${주제.라벨}`,
        직전글 ? `직전 글\n${직전글.날짜} 「${직전글.제목}」\n${직전글.요약 ?? ''}` : '직전 글\n없음',
        `출판물 근거\n${근거들.map(근거 => `[${근거.표시}] ${근거.제목}\n${근거.본문}`).join('\n\n') || '없음'}`,
        '들어가는 말에서 직전 글의 날짜와 제목을 밝히고 오늘 주제가 왜 그다음인지 한 문장으로 잇는다.',
        '대화 시연은 집주인과 형제의 짧은 주고받기로 만든다.',
      ].join('\n\n'),
      스키마이름: '봉사모임원고',
      스키마: 원고스키마,
    });
  } catch {
    결과 = null;
  }

  const 초안 = 원고정규화(결과 ?? 폴백원고(주제, 직전글, 근거들));
  const 원고 = 성구채우기(초안, 도구);
  원고.출처 = 근거들.filter(근거 => 근거.url).map(근거 => ({ 제목: 근거.제목, url: 근거.url, 조회일: 근거.조회일 }));
  return { 원고, 생성방식: 결과 ? 'ai' : 'fallback' };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/service-meeting.test.mjs`
Expected: PASS 16개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/service-meeting.mjs src/service-meeting.test.mjs
git commit -m "봉사모임 원고를 만들고 성구를 로컬 본문으로 검증한다"
```

---

### Task 8: 웹 서버 라우트

**Files:**
- Modify: `src/service-meeting.mjs` (`prepareCandidates`, `prepareDraft`, `saveDraft` 를 더한다)
- Modify: `src/web-server.mjs` (import, 본문 읽기 헬퍼, 라우트 세 개)
- Create: `src/service-routes.test.mjs`

**Interfaces:**
- Consumes: `buildCandidates`, `buildDraft`, `근거모으기`, `loadTopics`, `createNotionClient`, `createTools`.
- Produces:
  - `prepareCandidates(root)` → `buildCandidates` 결과.
  - `prepareDraft({ 주제라벨, 날짜 }, root)` → `{ 주제, 날짜, 순번, 원고, 생성방식 }`.
  - `saveDraft({ 순번, 날짜, 제목, 원고 })` → `{ id, url }`. 노션 자격 증명만 쓰므로 `root` 를 받지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/service-routes.test.mjs` 를 만든다. 서버를 띄우지 않고 소스를 검사한다. 비밀 키가 브라우저로 새지 않는 것을 지키는 것이 목적이다.

```javascript
// 봉사인도 API 경로 등록과 비밀 키 경계를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const 서버 = readFileSync('src/web-server.mjs', 'utf8');

test('봉사인도 경로 세 개가 등록되어 있다', () => {
  assert.ok(서버.includes("'/api/service-meeting/candidates'"));
  assert.ok(서버.includes("'/api/service-meeting/draft'"));
  assert.ok(서버.includes("'/api/service-meeting/save'"));
});

test('원고와 저장은 POST 로만 받는다', () => {
  assert.match(서버, /service-meeting\/draft'[\s\S]{0,120}POST/);
  assert.match(서버, /service-meeting\/save'[\s\S]{0,120}POST/);
});

test('노션 토큰을 서버에서만 읽는다', () => {
  const 서비스 = readFileSync('src/service-meeting.mjs', 'utf8');
  assert.ok(서비스.includes('process.env.NOTION_TOKEN'));

  const 브라우저 = readFileSync('web/app.js', 'utf8');
  assert.ok(!브라우저.includes('NOTION_TOKEN'));
  assert.ok(!브라우저.includes('OPENAI_API_KEY'));
  assert.ok(!브라우저.includes('api.notion.com'));
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-routes.test.mjs`
Expected: FAIL. 경로가 없다.

- [ ] **Step 3: 서비스 진입점을 더한다**

`src/service-meeting.mjs` 의 import 에 더한다.

```javascript
import { join } from 'node:path';
import { createNotionClient } from './notion-client.mjs';
import { loadTopics } from './service-topics.mjs';
import { createTools } from './prep-service.mjs';
```

같은 파일 끝에 더한다.

```javascript
function 노션() {
  return createNotionClient({
    token: process.env.NOTION_TOKEN ?? '',
    databaseId: process.env.NOTION_SERVICE_DB_ID ?? '',
  });
}

export async function prepareCandidates(root = process.cwd()) {
  return buildCandidates({
    client: 노션(),
    주제들: loadTopics(join(root, 'src/service-topics.json')),
    오늘: new Date(),
  });
}

export async function prepareDraft({ 주제라벨, 날짜 }, root = process.cwd()) {
  if (!주제라벨) throw new Error('주제 라벨이 필요하다.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(날짜 ?? '')) throw new Error('날짜 형식은 YYYY-MM-DD 여야 한다');

  const 주제들 = loadTopics(join(root, 'src/service-topics.json'));
  const 주제정보 = 주제들[주제라벨];
  if (!주제정보) throw new Error(`공식 주제 목록에 없는 라벨이다: ${주제라벨}`);

  const client = 노션();
  const 행들 = await client.행목록();
  const 직전 = 직전완성글(행들);
  const 직전본문 = 직전 ? await client.페이지본문(직전.id).catch(() => '') : '';

  const 근거들 = await 근거모으기(주제정보.참고, { 조회일: new Date().toISOString().slice(0, 10) });
  const { 원고, 생성방식 } = await buildDraft({
    주제: { 라벨: 주제라벨, 참고: 주제정보.참고 },
    직전글: 직전 ? { 제목: 직전.제목, 날짜: 직전.날짜, 요약: 직전본문.slice(0, 800) } : null,
    근거들,
    도구: createTools(root),
  });

  return { 주제: 주제라벨, 날짜, 순번: 다음순번(행들), 원고, 생성방식 };
}

export async function saveDraft({ 순번, 날짜, 제목, 원고 }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(날짜 ?? '')) throw new Error('날짜 형식은 YYYY-MM-DD 여야 한다');
  if (!제목?.trim()) throw new Error('제목이 필요하다.');
  return 노션().행생성({ 순번, 날짜, 제목, 원고 });
}
```

- [ ] **Step 4: 라우트를 더한다**

`src/web-server.mjs` 의 import 에 더한다.

```javascript
import { prepareCandidates, prepareDraft, saveDraft } from './service-meeting.mjs';
```

`staticFile` 함수 아래에 본문 읽기 헬퍼를 더한다.

```javascript
async function 본문읽기(req) {
  const 조각들 = [];
  for await (const 조각 of req) 조각들.push(조각);
  return JSON.parse(Buffer.concat(조각들).toString('utf8') || '{}');
}
```

`if (url.pathname === '/api/life-ministry')` 블록 바로 아래에 더한다.

```javascript
    if (url.pathname === '/api/service-meeting/candidates') {
      json(res, 200, await prepareCandidates(root));
      return;
    }
    if (url.pathname === '/api/service-meeting/draft' && req.method === 'POST') {
      json(res, 200, await prepareDraft(await 본문읽기(req), root));
      return;
    }
    if (url.pathname === '/api/service-meeting/save' && req.method === 'POST') {
      json(res, 200, await saveDraft(await 본문읽기(req)));
      return;
    }
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

`web/app.js` 에는 아직 봉사인도 코드가 없지만 세 번째 테스트는 없음만 확인하므로 통과한다.

Run: `npm test -- src/service-routes.test.mjs`
Expected: PASS 3개.

- [ ] **Step 6: 전체 테스트를 돌린다**

Run: `npm test`
Expected: 실패 0개. 기존 스킵 2개는 그대로다.

- [ ] **Step 7: 커밋한다**

```bash
git add src/service-meeting.mjs src/web-server.mjs src/service-routes.test.mjs
git commit -m "봉사인도 API 경로를 더한다"
```

---

### Task 9: 봉사인도 화면

**Files:**
- Modify: `web/index.html` (내비게이션, 홈 카드, 새 섹션, `watchtower` 섹션 뒤)
- Modify: `web/app.js`
- Modify: `web/styles.css`
- Create: `src/service-view.test.mjs`

**Interfaces:**
- Consumes: `/api/service-meeting/candidates`, `/api/service-meeting/draft`, `/api/service-meeting/save`.
- Produces: 없음.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/service-view.test.mjs` 를 만든다.

```javascript
// 봉사인도 화면 구조와 복사 범위를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('web/index.html', 'utf8');
const app = readFileSync('web/app.js', 'utf8');

test('봉사인도가 활성 카드와 내비게이션에 있다', () => {
  assert.ok(html.includes('data-view="service-meeting"'));
  assert.ok(!/봉사인도[\s\S]{0,200}추후 추가 예정/.test(html));
});

test('후보와 원고와 동작 영역이 있다', () => {
  assert.ok(html.includes('id="service-candidates"'));
  assert.ok(html.includes('id="service-draft"'));
  assert.ok(html.includes('id="service-save"'));
  assert.ok(html.includes('id="service-copy"'));
});

test('순번과 날짜와 제목을 고칠 수 있다', () => {
  assert.ok(html.includes('id="service-order"'));
  assert.ok(html.includes('id="service-date"'));
  assert.ok(html.includes('id="service-title"'));
});

test('원고 복사는 출처와 선정 이유를 넣지 않는다', () => {
  const 시작 = app.indexOf('function 원고텍스트');
  assert.ok(시작 >= 0, '원고텍스트 함수가 있어야 한다');
  const 복사부분 = app.slice(시작, app.indexOf('}', app.indexOf('return 줄들.join')));
  assert.ok(!복사부분.includes('출처'));
  assert.ok(!복사부분.includes('이유'));
});

test('진행률 게이지를 만들지 않는다', () => {
  assert.ok(!html.includes('id="service-progress"'));
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인한다**

Run: `npm test -- src/service-view.test.mjs`
Expected: FAIL.

- [ ] **Step 3: HTML 을 고친다**

`web/index.html` 의 내비게이션에서 `파수대 연구` 버튼 아래에 더한다.

```html
        <button class="nav-button" data-view="service-meeting" type="button">봉사인도</button>
```

비활성 봉사인도 카드를 활성 카드로 바꾼다. 기존 블록을 통째로 갈아 끼운다.

```html
          <button class="service-card active-card" data-view="service-meeting" type="button">
            <span class="service-kicker">봉사모임</span>
            <strong>봉사인도</strong>
            <span>노션의 지난 원고를 이어 다음 주제를 준비합니다.</span>
          </button>
```

`watchtower` 섹션 닫는 태그 뒤에 새 섹션을 더한다.

```html
      <section id="service-meeting" class="view" aria-labelledby="service-head">
        <div class="workspace-head">
          <div>
            <p class="eyebrow">봉사모임</p>
            <h1 id="service-head">다음 원고 준비</h1>
          </div>
          <div class="controls">
            <button id="service-load" class="primary-button" type="button">후보 보기</button>
          </div>
        </div>
        <div id="service-candidates" class="result-panel"></div>
        <div class="service-fields">
          <label for="service-order">순번</label>
          <input id="service-order" type="number" min="1">
          <label for="service-date">날짜</label>
          <input id="service-date" type="date">
          <label for="service-title">제목</label>
          <input id="service-title" type="text">
        </div>
        <div id="service-draft" class="result-panel"></div>
        <div class="service-actions">
          <button id="service-copy" class="copy-button" type="button">원고 복사</button>
          <button id="service-save" class="primary-button" type="button">노션에 저장</button>
        </div>
      </section>
```

- [ ] **Step 4: app.js 를 고친다**

`web/app.js` 끝에 더한다. 기존 화면 전환 코드가 `data-view` 로 동작하므로 새 섹션은 자동으로 붙는다.

```javascript
let 현재원고 = null;
let 현재주제 = null;

function 원고텍스트(원고) {
  const 줄들 = [
    `오늘의 주제: ${원고.주제}`,
    '',
    '들어가는 말',
    원고.들어가는말,
    '',
    '성구 근거',
    원고.성구주소 ? `${원고.성구주소} — ${원고.성구본문}` : '성구 자동 확인 실패. 직접 확인이 필요하다.',
    '',
    '핵심 생각',
    ...(원고.핵심생각 ?? []).map(줄 => `- ${줄}`),
    '',
    '오늘의 대화 시연',
    ...(원고.대화시연 ?? []).map(마디 => `${마디.역할}: ${마디.말}`),
    '',
    '오늘 실천할 제안',
    ...(원고.실천제안 ?? []).map(줄 => `[ ] ${줄}`),
    '',
    '마무리 격려',
    원고.마무리격려,
  ];
  return 줄들.join('\n');
}

function 원고그리기(자료) {
  const 영역 = document.getElementById('service-draft');
  영역.textContent = '';

  const 본문 = document.createElement('pre');
  본문.className = 'draft-text';
  본문.textContent = 원고텍스트(자료.원고);
  영역.append(본문);

  if (자료.원고.경고) {
    const 경고 = document.createElement('p');
    경고.className = 'warning';
    경고.textContent = 자료.원고.경고;
    영역.append(경고);
  }

  for (const 출처 of 자료.원고.출처 ?? []) {
    const 링크 = document.createElement('a');
    링크.href = 출처.url;
    링크.target = '_blank';
    링크.rel = 'noreferrer';
    링크.textContent = `${출처.제목} (조회일 ${출처.조회일})`;
    영역.append(링크, document.createElement('br'));
  }
}

async function 원고만들기() {
  const 영역 = document.getElementById('service-draft');
  if (!현재주제) {
    영역.textContent = '주제를 먼저 고릅니다.';
    return;
  }
  영역.textContent = '출판물 근거를 읽고 원고를 만드는 중입니다.';
  try {
    const 응답 = await fetch('/api/service-meeting/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 주제라벨: 현재주제, 날짜: document.getElementById('service-date').value }),
    });
    const 자료 = await 응답.json();
    if (!응답.ok) throw new Error(자료.error ?? '원고를 만들지 못했습니다.');
    현재원고 = 자료.원고;
    원고그리기(자료);
  } catch (e) {
    영역.textContent = e.message;
  }
}

async function 후보불러오기() {
  const 영역 = document.getElementById('service-candidates');
  영역.textContent = '노션에서 지난 원고를 읽는 중입니다.';
  try {
    const 응답 = await fetch('/api/service-meeting/candidates');
    const 자료 = await 응답.json();
    if (!응답.ok) throw new Error(자료.error ?? '후보를 가져오지 못했습니다.');

    document.getElementById('service-order').value = 자료.다음순번;
    document.getElementById('service-date').value = 자료.다음날짜;

    영역.textContent = '';
    const 안내 = document.createElement('p');
    안내.textContent = 자료.직전글
      ? `직전 글은 ${자료.직전글.날짜} 「${자료.직전글.제목}」입니다.`
      : '직전 글이 없습니다. 첫 회차로 준비합니다.';
    영역.append(안내);

    for (const 후보 of 자료.후보들) {
      const 줄 = document.createElement('label');
      줄.className = 'candidate';
      const 라디오 = document.createElement('input');
      라디오.type = 'radio';
      라디오.name = 'service-candidate';
      라디오.value = 후보.라벨;
      라디오.addEventListener('change', () => {
        현재주제 = 후보.라벨;
        document.getElementById('service-title').value = 후보.라벨;
      });
      const 이름 = document.createElement('strong');
      이름.textContent = 후보.라벨;
      const 이유 = document.createElement('span');
      이유.textContent = 후보.이유;
      const 글 = document.createElement('span');
      글.append(이름, document.createElement('br'), 이유);
      줄.append(라디오, 글);
      영역.append(줄);
    }

    const 만들기 = document.createElement('button');
    만들기.className = 'primary-button';
    만들기.textContent = '원고 만들기';
    만들기.addEventListener('click', 원고만들기);
    영역.append(만들기);
  } catch (e) {
    영역.textContent = e.message;
  }
}

document.getElementById('service-load')?.addEventListener('click', 후보불러오기);

document.getElementById('service-copy')?.addEventListener('click', async () => {
  if (!현재원고) return;
  await navigator.clipboard.writeText(원고텍스트(현재원고));
});

document.getElementById('service-save')?.addEventListener('click', async () => {
  const 영역 = document.getElementById('service-draft');
  if (!현재원고) return;
  const 알림 = document.createElement('p');
  try {
    const 응답 = await fetch('/api/service-meeting/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        순번: Number(document.getElementById('service-order').value),
        날짜: document.getElementById('service-date').value,
        제목: document.getElementById('service-title').value,
        원고: 현재원고,
      }),
    });
    const 자료 = await 응답.json();
    if (!응답.ok) throw new Error(자료.error ?? '저장하지 못했습니다.');
    알림.textContent = `노션에 저장했습니다. ${자료.url}`;
  } catch (e) {
    알림.className = 'warning';
    알림.textContent = e.message;
  }
  영역.append(알림);
});
```

- [ ] **Step 5: styles.css 를 더한다**

`web/styles.css` 끝에 더한다. 답변 영역의 연한 초록색은 기존 규칙이므로 건드리지 않고, 원고는 흰 바탕에 둔다.

```css
.service-fields { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin: 16px 0; }
.service-fields input { padding: 8px; border: 1px solid #d0d5dd; border-radius: 6px; max-width: 100%; }
.service-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 16px; }
.candidate { display: flex; gap: 10px; align-items: flex-start; padding: 12px; border: 1px solid #d0d5dd; border-radius: 8px; margin: 8px 0; }
.draft-text { white-space: pre-wrap; word-break: break-word; font-family: inherit; line-height: 1.7; margin: 0; }
.warning { color: #b42318; }
```

- [ ] **Step 6: 테스트가 통과하는지 확인한다**

Run: `npm test -- src/service-view.test.mjs`
Expected: PASS 5개.

- [ ] **Step 7: 전체 테스트를 돌린다**

Run: `npm test`
Expected: 실패 0개.

- [ ] **Step 8: 커밋한다**

```bash
git add web/index.html web/app.js web/styles.css src/service-view.test.mjs
git commit -m "봉사인도 화면을 더한다"
```

---

### Task 10: 문서와 실제 검증

**Files:**
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `checklist.md`
- Modify: `context-notes.md`
- Modify: `docs/핵심-운영-인수인계.md`

**Interfaces:**
- Consumes: 앞의 모든 과제.
- Produces: 없음.

- [ ] **Step 1: `.env.example` 을 고친다**

```
# OpenAI 서버 전용 환경 변수 예시
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini

# 노션 봉사모임 연동 서버 전용 환경 변수 예시
NOTION_TOKEN=
NOTION_SERVICE_DB_ID=38276147-3735-80e4-99ca-cb4e81cb6c53
```

- [ ] **Step 2: 전체 테스트를 돌린다**

Run: `npm test`
Expected: 실패 0개. 기존 스킵 2개는 그대로다.

- [ ] **Step 3: 사람이 노션 통합을 만든다**

이 단계는 김동언 형제가 직접 한다. 에이전트가 대신할 수 없다.

1. `https://www.notion.so/my-integrations` 에서 내부 통합을 만든다.
2. 노션에서 `봉사모임` 페이지를 열고 그 통합에 공유한다.
3. 발급된 토큰을 `.env` 의 `NOTION_TOKEN` 에 넣는다.

- [ ] **Step 4: 실제 후보 조회를 검증한다**

```bash
npm run web
```

다른 터미널에서 확인한다.

```bash
curl -s http://localhost:3000/api/service-meeting/candidates
```

Expected: `다음순번` 이 12, `다음날짜` 가 다음 금요일, `직전글.제목` 이 `재방문을 실제로 하십시오`, `후보들` 이 3개다. 토큰이 없으면 `노션 토큰이 설정되지 않았다` 가 나온다.

- [ ] **Step 5: 실제 원고 생성을 검증한다**

브라우저에서 `http://localhost:3000` 을 열고 봉사인도로 간다. 후보를 하나 고르고 원고를 만든다. 아래를 하나씩 눈으로 확인한다.

- 들어가는 말에 직전 글의 날짜와 제목이 들어 있다.
- 성구 근거의 본문이 `core/bible/text/` 의 실제 문장과 같다. 한 절을 `npm run 성구 -- "<주소>"` 로 직접 대조한다.
- 출처 링크가 실제 WOL `/d/` 문서로 열리고 조회일이 붙어 있다.
- 한국어 문장이 콜론으로 끝나지 않는다.
- 한국어 이외의 문자 체계가 섞이지 않았다.

- [ ] **Step 6: 저장과 중복 거부를 검증한다**

`노션에 저장` 을 누른다. 노션에 순번 12 행이 생기는지 확인한다. 같은 순번으로 한 번 더 누르면 `순번 12가 이미 있다` 가 나오고 행이 더 생기지 않아야 한다. 기존 11개 행이 그대로인지 확인한다.

- [ ] **Step 7: 문서를 고친다**

`README.md` 의 웹앱 절 아래에 봉사인도 문단을 더한다. 로컬 전용인 이유와 노션 통합 준비 단계를 적는다.

`checklist.md` 끝에 절을 더한다.

```markdown
## 봉사인도 — 2026-08-21

- [x] Task 1 WOL 야외 봉사 색인 파서.
- [x] Task 2 주제 매니페스트 생성과 기준선 감시.
- [x] Task 3 노션 봉사모임 읽기.
- [x] Task 4 노션 새 행 생성과 중복 거부.
- [x] Task 5 자유 형식 구조화 출력 호출.
- [x] Task 6 다음 주제 후보 선정.
- [x] Task 7 원고 생성과 성구 로컬 검증.
- [x] Task 8 봉사인도 API 경로.
- [x] Task 9 봉사인도 화면.
- [x] Task 10 문서와 실제 검증.
```

`context-notes.md` 맨 위에 항목을 더한다. 최소한 아래 세 가지를 남긴다.

- `openai-text.mjs` 를 `ai-answer.mjs` 와 중복으로 둔 이유와 나중에 합칠 조건.
- 이 기능이 로컬 전용인 이유가 `/pc/` 의 Vercel 시간 초과라는 것.
- 실제 검증에서 나온 수치. 후보 수, 원고 생성 시간, 성구 대조 결과다.

`docs/핵심-운영-인수인계.md` 의 7절 미구현 목록에서 봉사인도를 빼고, 로컬 전용 기능이라는 절을 더한다. 8절 기준선의 테스트 수도 실제 값으로 고친다.

- [ ] **Step 8: 마지막 전체 테스트와 커밋**

```bash
npm test
git add .env.example README.md checklist.md context-notes.md docs/핵심-운영-인수인계.md
git commit -m "봉사인도 운영 문서를 정리한다"
```
