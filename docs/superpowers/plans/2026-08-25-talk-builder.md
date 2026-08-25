# 연설 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 웹앱 홈에 `준비 중`으로 있는 `연설` 카드를 구현한다. 그 주 교재에서 배정을 뽑아 화자의 신원과 문체에 맞춘 원고를 만들고, 준비용 원고·낭독용 대본·연단 큐카드·자기 점검표 네 가지를 화면에서 복사하고 내려받게 한다.

**Architecture:** AI가 만드는 것은 원고 구조체 하나뿐이고 산출물 넷은 코드가 그것에서 파생한다. 「읽가」와 「랑제」의 과별 요점은 `src/teaching-lessons.json`으로 미리 굳혀 런타임에 네트워크를 쓰지 않는다. 소제목이 이미 확정된 두 종류(보물 연설, 공개강연)는 뼈대 단계에서 AI를 부르지 않는다. 성구 본문은 언제나 `core/bible/text/`에서만 온다.

**Tech Stack:** Node 24 ESM, `node --test`, 기본 `fetch`, 외부 npm 의존성 없음. OpenAI Responses API.

**Spec:** `docs/superpowers/specs/2026-08-25-talk-builder-design.md`

## Global Constraints

- Node 24 ESM만 쓴다. 외부 npm 의존성을 추가하지 않는다.
- 새 소스 파일의 첫 줄은 역할을 설명하는 한국어 한 줄 주석이다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- 한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.
- 성구 인용은 `core/bible/text/`에서 실제로 읽은 문자열만 쓴다. 모델이 쓴 성구 문장을 그대로 쓰는 경로를 만들지 않는다.
- 출판물 근거를 찾지 못한 문장에는 `출판물 근거 미확인 — 내 정리임.`을 붙인다.
- 조회한 출판물은 URL과 조회 날짜를 함께 남긴다.
- 교재나 공개강연 개요에서 온 소제목 문장을 고치지 않는다. 축약 대상에서도 뺀다.
- 「읽가」·「랑제」 전권을 프롬프트에 넣는 경로를 만들지 않는다.
- 비밀 키는 서버 환경 변수로만 읽는다. 브라우저 코드, 로그, Git에 넣지 않는다.
- `src/ai-answer.mjs`를 건드리지 않는다. 검증된 운영 경로다.
- `parseMinistryMeeting`의 기존 반환값을 바꾸지 않는다. 항목만 더한다.
- 테스트는 `node --test`로 돌리며 네트워크를 타지 않는다. 실물 조회는 과제 13에서 사람이 한 번 돌린다.
- 기준선은 177개 중 175개 통과, 2개 스킵, 실패 0개다. 이보다 줄면 안 된다.

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/teaching-lessons.mjs` | 교본 과 HTML을 요점 객체로 바꾸고 매니페스트를 읽는다 |
| `src/teaching-lessons.json` | 생성된 교본 매니페스트. 과별 제목과 요점 한 문단만 담는다 |
| `scripts/refresh-teaching-lessons.mjs` | 매니페스트를 만들고 기준선을 감시한다 |
| `src/talk-assignments.mjs` | 그 주 교재 HTML을 배정 항목 목록으로 바꾼다 |
| `src/talk-profile.mjs` | 화자 프로필과 자격 게이트 |
| `src/talk-timing.mjs` | 낭독 시간 계산과 축약 제안 |
| `src/talk-render.mjs` | 원고 구조체에서 산출물 네 개를 만든다 |
| `src/talk-verses.mjs` | 원고 구조체의 성구 주소를 로컬 본문으로 채운다 |
| `src/openai-text.mjs` | 자유 형식 구조화 출력 전용 최소 OpenAI 호출 |
| `src/talk-outline.mjs` | 뼈대를 만든다. 코드 경로와 AI 경로가 있다 |
| `src/talk-draft.mjs` | 뼈대에 살을 채우고 성구를 검증한다 |
| `src/talk-service.mjs` | 세 API가 부르는 조립 계층 |
| `src/web-server.mjs` | 라우트 세 개를 더한다 |
| `api/talk-assignments.js` `api/talk-outline.js` `api/talk-draft.js` | Vercel 어댑터 |
| `web/index.html` `web/app.js` `web/styles.css` | 연설 화면 |

## 원고 구조체

모든 과제가 이 모양을 공유한다. 과제 5부터 계속 나온다.

```js
{
  제목: '',                    // string
  종류: '보물연설',            // '보물연설'|'성경낭독'|'시연'|'학생연설'|'생활부분'|'공개강연'
  배정시간: 600,               // number. 초
  지정요점: null,              // { 책:'읽가'|'랑제', 과:number, 요점:number|null, 제목:string, 요점본문:string } | null
  주제성구: null,              // { 주소:string, 본문:string } | null
  설정: null,                  // { 등장인물:[{역할:string,설명:string}], 상황:string, 준비물:[string] } | null
  구간: [],                    // [{ 이름:string, 시작초:number, 끝초:number, 목적:string }]
  대사: [],                    // [{ 구간:string, 화자:string, 말:string, 동작:string, 요점표시:string }]
  단락: [],                    // [{ 소제목:string, 출처:'교재'|'개요'|'생성', 요점:[string], 예화:string, 적용:string, 성구주소:[string] }]
  성구: [],                    // [{ 주소:string, 본문:string }]
  축약순서: [],                // [{ 순위:number, 대상:string, 사유:string }]
  출처: [],                    // [{ 제목:string, url:string, 조회일:string }]
  경고: [],                    // [string]
}
```

`대사.동작`과 `대사.요점표시`는 없으면 빈 문자열이다. `null`을 쓰지 않는다.

---

### Task 1: 교본 과 파서

**Files:**
- Create: `src/teaching-lessons.mjs`
- Create: `src/teaching-lessons.test.mjs`
- Create: `tests/fixtures/읽가-1과.html`
- Create: `tests/fixtures/랑제-3과.html`

**Interfaces:**
- Consumes: 없음.
- Produces:
  - `parseTeachingLesson(html)` → `{ 책, 과, 제목, 요점, 원칙 }`. `책`은 `'읽가'` 또는 `'랑제'`. `과`는 number. `요점`과 `원칙`은 string이며 없으면 빈 문자열.
  - `loadTeachingLessons(경로)` → 매니페스트 객체. 과제 2가 만드는 JSON을 읽는다.
  - `찾기(매니페스트, 책, 과)` → `{ 번호, 제목, 요점, docid }` 또는 `null`.

- [ ] **Step 1: 픽스처 두 개를 만든다**

실물 마크업의 특징만 남기고 줄인다. 「읽가」는 `이 과의 요점` 다음 문단이 요점이고, 「랑제」는 `원칙:` 문단이 있고 `이 과의 요점`이 없다.

`tests/fixtures/읽가-1과.html`

```html
<article class="article" id="article">
<p id="p1" data-pid="1" class="contextTitle">읽고 가르치는 기술을 발전시키십시오</p>
<p id="p2" data-pid="2" class="contextTitle">읽가 제1과 」 4면</p>
<h1 id="p3" data-pid="3"><strong>1과 효과적인 서론</strong></h1>
<p id="p4" data-pid="4" class="themeScrp"><a href="/ko/wol/bc/r8/lp-ko/1102018441/1/0" class="b">사도행전 17:22</a></p>
<p id="p5" data-pid="5"><strong>이 과의 요점:</strong> 서론에서 듣는 사람의 흥미를 불러일으키고, 말할 내용이 무엇인지 밝히고, 듣는 사람이 왜 관심을 가져야 하는지 알려 주어야 합니다.</p>
<h2 id="p6" data-pid="6"><strong>어떻게 해야 하는가?</strong></h2>
<p id="p7" data-pid="7"><strong>흥미를 불러일으킨다.</strong> 듣는 사람이 관심 있어 할 만한 질문을 하십시오.</p>
<p id="p8" data-pid="8"><strong>말할 내용이 무엇인지 밝힌다.</strong> 목적을 서론에서 분명히 밝히십시오.</p>
</article>
```

`tests/fixtures/랑제-3과.html`

```html
<article class="article" id="article">
<p id="p1" data-pid="1" class="contextTitle">사람들을 사랑하고 제자로 삼으십시오</p>
<p id="p2" data-pid="2" class="contextTitle">랑제 제3과</p>
<h1 id="p3" data-pid="3"><strong>3과 친절</strong></h1>
<p id="p4" data-pid="4"><strong>원칙:</strong> “사랑은 ··· 친절합니다.”—<a href="/ko/wol/bc/r8/lp-ko/1102023303/1/0" class="b">고린도 전서 13:4</a>.</p>
<h2 id="p5" data-pid="5"><strong>예수의 본</strong></h2>
<p id="p6" data-pid="6">1. 동영상을 보거나 요한복음 9:1-7을 읽어 보십시오.</p>
<h2 id="p7" data-pid="7"><strong>예수를 본받으십시오</strong></h2>
<p id="p8" data-pid="8">4. 친절하고 존중심 있게 말하십시오. 무슨 말을 어떤 어조로 할지 신중하게 생각한 다음 말하십시오.</p>
</article>
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/teaching-lessons.test.mjs`

```js
// 교본 과 파서와 매니페스트 로더를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTeachingLesson, 찾기 } from './teaching-lessons.mjs';

const 읽가1 = readFileSync('tests/fixtures/읽가-1과.html', 'utf8');
const 랑제3 = readFileSync('tests/fixtures/랑제-3과.html', 'utf8');

test('「읽가」 과에서 책과 번호와 제목과 요점을 뽑는다', () => {
  const 결과 = parseTeachingLesson(읽가1);

  assert.equal(결과.책, '읽가');
  assert.equal(결과.과, 1);
  assert.equal(결과.제목, '효과적인 서론');
  assert.equal(
    결과.요점,
    '서론에서 듣는 사람의 흥미를 불러일으키고, 말할 내용이 무엇인지 밝히고, 듣는 사람이 왜 관심을 가져야 하는지 알려 주어야 합니다.',
  );
});

test('요점에서 「이 과의 요점:」 라벨을 떼어 낸다', () => {
  const 결과 = parseTeachingLesson(읽가1);

  assert.ok(!결과.요점.startsWith('이 과의 요점'));
  assert.ok(!결과.요점.startsWith(':'));
});

test('「랑제」 과에서 원칙을 뽑고 요점은 비운다', () => {
  const 결과 = parseTeachingLesson(랑제3);

  assert.equal(결과.책, '랑제');
  assert.equal(결과.과, 3);
  assert.equal(결과.제목, '친절');
  assert.equal(결과.원칙, '“사랑은 ··· 친절합니다.”—고린도 전서 13:4.');
  assert.equal(결과.요점, '');
});

test('제목에서 「N과」 접두를 떼어 낸다', () => {
  assert.equal(parseTeachingLesson(랑제3).제목, '친절');
  assert.equal(parseTeachingLesson(읽가1).제목, '효과적인 서론');
});

test('매니페스트에서 책과 과로 찾는다', () => {
  const 매니페스트 = {
    읽가: { 제목: '읽고 가르치는 기술을 발전시키십시오', 과: [{ 번호: 2, 제목: '자연스럽게 말하기', 요점: '가', docid: 1102018442 }] },
    랑제: { 제목: '사람들을 사랑하고 제자로 삼으십시오', 과: [] },
  };

  assert.deepEqual(찾기(매니페스트, '읽가', 2), { 번호: 2, 제목: '자연스럽게 말하기', 요점: '가', docid: 1102018442 });
  assert.equal(찾기(매니페스트, '읽가', 99), null);
  assert.equal(찾기(매니페스트, '없는책', 2), null);
});
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/teaching-lessons.test.mjs`
Expected: FAIL. `Cannot find module './teaching-lessons.mjs'`.

- [ ] **Step 4: 최소 구현을 쓴다**

`src/teaching-lessons.mjs`. `요소들`과 `텍스트`는 `src/wol-html.mjs`에 이미 있다.

```js
// 「읽가」·「랑제」 과 문서를 요점 객체로 바꾸고 교본 매니페스트를 읽는 모듈
import { readFileSync } from 'node:fs';
import { 요소들, 텍스트 } from './wol-html.mjs';

const 책이름 = { 읽가: '읽고 가르치는 기술을 발전시키십시오', 랑제: '사람들을 사랑하고 제자로 삼으십시오' };

function 라벨떼기(문장, 라벨) {
  return 문장.replace(new RegExp(`^\\s*${라벨}\\s*:?\\s*`), '').trim();
}

export function parseTeachingLesson(html) {
  const blocks = 요소들(html, ['h1', 'h2', 'p']);
  const 문맥 = blocks.map(b => b.텍스트).find(t => /^(읽가|랑제)\s*제\d+과/.test(t)) ?? '';
  const 책 = (문맥.match(/^(읽가|랑제)/) || [])[1] ?? '';
  const 제목줄 = blocks.find(b => b.태그 === 'h1')?.텍스트 ?? '';
  const 과 = Number((제목줄.match(/^(\d+)과/) || [])[1] ?? (문맥.match(/제(\d+)과/) || [])[1] ?? 0);
  const 제목 = 제목줄.replace(/^\d+과\s*/, '').trim();

  const 요점줄 = blocks.find(b => b.태그 === 'p' && /^이 과의 요점/.test(b.텍스트));
  const 원칙줄 = blocks.find(b => b.태그 === 'p' && /^원칙/.test(b.텍스트));

  return {
    책,
    과,
    제목,
    요점: 요점줄 ? 라벨떼기(요점줄.텍스트, '이 과의 요점') : '',
    원칙: 원칙줄 ? 라벨떼기(원칙줄.텍스트, '원칙') : '',
  };
}

export function loadTeachingLessons(경로) {
  return JSON.parse(readFileSync(경로, 'utf8'));
}

export function 찾기(매니페스트, 책, 과) {
  return (매니페스트?.[책]?.과 ?? []).find(x => x.번호 === Number(과)) ?? null;
}

export { 책이름, 텍스트 };
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/teaching-lessons.test.mjs`
Expected: PASS 5개.

- [ ] **Step 6: 커밋한다**

```bash
git add src/teaching-lessons.mjs src/teaching-lessons.test.mjs tests/fixtures/읽가-1과.html tests/fixtures/랑제-3과.html
git commit -m "교본 과 문서를 요점 객체로 파싱한다"
```

---

### Task 2: 교본 매니페스트 생성기

**Files:**
- Create: `scripts/refresh-teaching-lessons.mjs`
- Create: `src/teaching-lessons.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: `parseTeachingLesson(html)` (과제 1). `fetchCached(url, cacheName)` (`src/wol-fetch.mjs`).
- Produces: `src/teaching-lessons.json`. 모양은 이렇다.

```json
{
  "읽가": {
    "제목": "읽고 가르치는 기술을 발전시키십시오",
    "조회일": "2026-08-25",
    "과": [{ "번호": 1, "제목": "효과적인 서론", "요점": "서론에서 ...", "원칙": "", "docid": 1102018441 }]
  },
  "랑제": { "제목": "사람들을 사랑하고 제자로 삼으십시오", "조회일": "2026-08-25", "과": [] }
}
```

- [ ] **Step 1: 생성기를 쓴다**

「읽가」 docid는 `1102018441`부터 연속이며 `1102018461`은 이 브로슈어가 아니다. 「랑제」는 시작 docid만 알고 과 수를 모르므로, 같은 방식으로 `parseTeachingLesson`이 `책`을 `'랑제'`로 읽지 못할 때까지 나아가고 최대 60회에서 멈춘다.

`scripts/refresh-teaching-lessons.mjs`

```js
// 「읽가」·「랑제」 전 과를 훑어 교본 매니페스트를 만들고 기준선을 감시하는 스크립트
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCached } from '../src/wol-fetch.mjs';
import { parseTeachingLesson, 책이름 } from '../src/teaching-lessons.mjs';

const 루트 = join(fileURLToPath(new URL('..', import.meta.url)));
const 산출경로 = join(루트, 'src', 'teaching-lessons.json');
const 기준선 = { 읽가: 20, 랑제: 1 };
const 시작 = { 읽가: 1102018441, 랑제: 1102023301 };
const 최대 = 60;

function 오늘() {
  return new Date().toISOString().slice(0, 10);
}

async function 책수집(책) {
  const 과들 = [];
  for (let i = 0; i < 최대; i++) {
    const docid = 시작[책] + i;
    let 결과;
    try {
      const html = await fetchCached(`https://wol.jw.org/ko/wol/d/r8/lp-ko/${docid}`, `교본-${docid}.html`);
      결과 = parseTeachingLesson(html);
    } catch (e) {
      console.log(`  ${docid} 조회 실패 — ${e.message}`);
      break;
    }
    if (결과.책 !== 책 || !결과.과) break;
    과들.push({ 번호: 결과.과, 제목: 결과.제목, 요점: 결과.요점, 원칙: 결과.원칙, docid });
    console.log(`  ${책} ${결과.과}과 ${결과.제목}`);
  }
  return 과들;
}

const 매니페스트 = {};
for (const 책 of ['읽가', '랑제']) {
  console.log(`${책} 수집 중.`);
  매니페스트[책] = { 제목: 책이름[책], 조회일: 오늘(), 과: await 책수집(책) };
}

writeFileSync(산출경로, `${JSON.stringify(매니페스트, null, 2)}\n`, 'utf8');

let 미달 = false;
for (const [책, 최소] of Object.entries(기준선)) {
  const 수 = 매니페스트[책].과.length;
  console.log(`${책} ${수}과 (기준선 ${최소})`);
  if (수 < 최소) {
    console.error(`  ${책}가 기준선보다 적다. 파서나 docid 범위를 확인하라.`);
    미달 = true;
  }
}

console.log(`${산출경로} 에 썼다.`);
process.exit(미달 ? 1 : 0);
```

- [ ] **Step 2: `package.json`에 스크립트를 더한다**

`"refresh:references"` 줄 바로 아래에 넣는다.

```json
"refresh:teaching-lessons": "node --no-warnings scripts/refresh-teaching-lessons.mjs",
```

- [ ] **Step 3: 실제로 돌린다**

Run: `npm run refresh:teaching-lessons`
Expected: 「읽가」 20과가 나오고 「랑제」는 실제 과 수가 나온다. 종료 코드 0이다. 1.5초 간격이라 몇 분 걸린다.

「읽가」가 20과보다 적으면 파서를 고친다. 「랑제」 시작 docid가 틀려 0과가 나오면, 알려진 3과 `1102023303`에서 거꾸로 세어 시작값을 고친다.

- [ ] **Step 4: 「랑제」 기준선을 실측값으로 굳힌다**

3단계에서 나온 「랑제」 과 수를 `기준선` 상수에 적어 넣는다. 그리고 설계 문서 9절의
`「랑제」 기준선은 생성기를 처음 돌려 확정한 뒤 여기에 적는다.` 문장을 실측값으로 바꾼다.

- [ ] **Step 5: 다시 돌려 기준선이 통과하는지 본다**

Run: `npm run refresh:teaching-lessons`
Expected: 종료 코드 0. `.cache/wol/` 캐시가 있으므로 이번엔 즉시 끝난다.

- [ ] **Step 6: 커밋한다**

```bash
git add scripts/refresh-teaching-lessons.mjs src/teaching-lessons.json package.json docs/superpowers/specs/2026-08-25-talk-builder-design.md
git commit -m "교본 요점 매니페스트를 생성한다"
```

---

### Task 3: 배정 파서

**Files:**
- Create: `src/talk-assignments.mjs`
- Create: `src/talk-assignments.test.mjs`
- Create: `tests/fixtures/교재-배정.html`

**Interfaces:**
- Consumes: `요소들`, `링크들`, `텍스트` (`src/wol-html.mjs`).
- Produces: `parseTalkAssignments(html)` → 배정 배열. 각 원소는 이렇다.

```js
{
  번호: 1,                    // number
  제목: '',                   // string
  절: '보물',                 // '보물'|'야외봉사'|'생활'
  종류: '보물연설',           // '보물연설'|'성경낭독'|'시연'|'학생연설'|'생활부분'|'연설아님'
  시간초: 600,                // number
  봉사형태: '',               // string. '호별 방문' 등. 없으면 빈 문자열
  설명: '',                   // string. 첫 p 에서 (N분) 을 뗀 나머지
  지정요점: null,             // { 책, 과, 요점 } | null. 요점은 number|null
  소제목: [],                 // [{ 문장: string, 성구: [string], 출판물: [{ 표시, pc }] }]
  묵상: '',                   // string
  낭독범위: '',               // string. 성경 낭독일 때만
  교재원문: '',               // string
}
```

- [ ] **Step 1: 픽스처를 만든다**

실물 `202026248`의 마크업을 줄이되 함정을 전부 남긴다. 함정은 다섯이다.

1. 1번은 `(10분)`만 담긴 `p`가 따로 있고 소제목 `p`들이 형제 `div`에 있다. 4·5·6번은 `(N분)`과 내용이 한 `p`에 있다.
2. 소제목 사이에 `<figure><img alt="..."></figure>`가 끼어 있다. 이것을 소제목으로 세면 안 된다.
3. 성구 앵커가 쪼개져 있다. `렘 30:11;`과 ` 히 12:6`이 각각 `<a class="b">`다.
4. 성구는 `/bc/`, 출판물은 `/pc/`로 갈린다. `class="b"`도 성구에만 붙는다.
5. 2번 영적 보물 찾기는 연설이 아니다.

`tests/fixtures/교재-배정.html`

```html
<article class="article" id="article">
<h1 id="p1" data-pid="1">2026년 8월 24-30일</h1>
<h2 id="p4" data-pid="4"><strong>성경에 담긴 보물</strong></h2>
<h3 id="p5" data-pid="5"><strong>1. 여호와께서는 자신의 종들을 적절한 정도로 징계하십니다</strong></h3>
<div id="tt12"><p id="p6" data-pid="6">(10분)</p></div>
<p id="p7" data-pid="7">회개하는 유대인들은 마음을 다해 여호와를 찾을 것이었습니다 (<a href="/ko/wol/bc/r8/lp-ko/202026248/1/0" class="b">렘 29:12, 13</a>; <a href="/ko/wol/pc/r8/lp-ko/202026248/1/0">「예레」 114면 3항</a>)</p>
<p id="p8" data-pid="8">여호와께서는 자신의 백성이 고토로 돌아오게 하실 것이었습니다 (<a href="/ko/wol/bc/r8/lp-ko/202026248/2/0" class="b">렘 29:14</a>)</p>
<p id="p9" data-pid="9">그들은 멸망되는 것이 아니라 “적절한 정도로” 징계를 받을 것이었습니다 (<a href="/ko/wol/bc/r8/lp-ko/202026248/3/0" class="b">렘 30:11;</a><a href="/ko/wol/bc/r8/lp-ko/202026248/3/1" class="b"> 히 12:6</a>; <a href="/ko/wol/pc/r8/lp-ko/202026248/2/0">「예레」 168면 2항</a>)</p>
<figure><img src="/ko/wol/mp/r8/lp-ko/mwb26/2026/301" alt="세 명의 장로가 한 형제와 모임을 갖고 있습니다." /></figure>
<p id="p10" data-pid="10"><span><strong>묵상해 볼 점:</strong></span> 여호와께서 우리를 징계하실 때 어떤 반응을 보여야 합니까?—<a href="/ko/wol/pc/r8/lp-ko/202026248/3/0">「파22.11」 21면 6항</a>.</p>
<h3 id="p11" data-pid="11"><strong>2. 영적 보물 찾기</strong></h3>
<div id="tt17"><p id="p12" data-pid="12">(10분)</p></div>
<ul><li id="p13" data-pid="13"><a href="/ko/wol/bc/r8/lp-ko/202026248/4/0" class="b">렘 30:11</a>—부모는 자녀를 징계할 때 어떻게 여호와를 본받을 수 있습니까?</li></ul>
<h3 id="p17" data-pid="17"><strong>3. 성경 낭독</strong></h3>
<div id="tt30"><p id="p18" data-pid="18">(4분) <a href="/ko/wol/bc/r8/lp-ko/202026248/5/0" class="b">렘 30:1-11</a> (<a href="/ko/wol/pc/r8/lp-ko/202026248/5/0">「읽가」 2과</a>)</p></div>
<h2 id="p19" data-pid="19"><strong>야외 봉사에 힘쓰십시오</strong></h2>
<h3 id="p20" data-pid="20"><strong>4. 대화 시작하기</strong></h3>
<div id="tt34"><p id="p21" data-pid="21">(4분) 호별 방문. 9월 특별 활동의 주제를 근거로 대화를 시작하고 성서 연구를 제안한다. (<a href="/ko/wol/pc/r8/lp-ko/202026248/6/0">「랑제」 3과 요점 4</a>)</p></div>
<h3 id="p24" data-pid="24"><strong>6. 연설</strong></h3>
<div id="tt38"><p id="p25" data-pid="25">(5분) <a href="/ko/wol/pc/r8/lp-ko/202026248/8/0">「웹성해」 기사 6</a>—주제: <a href="/ko/wol/bc/r8/lp-ko/202026248/6/0" class="b">예레미야 29:11</a>의 의미는 무엇입니까? (<a href="/ko/wol/pc/r8/lp-ko/202026248/9/0">「읽가」 1과</a>)</p></div>
<h2 id="p26" data-pid="26"><strong>그리스도인 생활</strong></h2>
<h3 id="p28" data-pid="28"><strong>7. 여호와는 자신의 종들에게 희망을 주십니다</strong></h3>
<div id="tt42"><p id="p29" data-pid="29">(10분) 토의.</p></div>
<p id="p30" data-pid="30">유대인들이 바빌론에 포로로 잡혀 있는 동안, 여호와께서는 그들이 결국 고토로 돌아가게 될 것이라고 약속하셨습니다. (<a href="/ko/wol/bc/r8/lp-ko/202026248/7/0" class="b">렘 29:10</a>)</p>
<h3 id="p40" data-pid="40"><strong>9. 회중 성서 연구</strong></h3>
<div id="tt50"><p id="p41" data-pid="41">(30분) <a href="/ko/wol/pc/r8/lp-ko/202026248/11/0">「용하」 5장</a></p></div>
</article>
```

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/talk-assignments.test.mjs`

```js
// 그 주 교재에서 연설 배정을 뽑는 파서를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTalkAssignments } from './talk-assignments.mjs';

const html = readFileSync('tests/fixtures/교재-배정.html', 'utf8');
const 배정 = parseTalkAssignments(html);
const 번호로 = n => 배정.find(x => x.번호 === n);

test('세 절의 항목을 번호 순서대로 모두 뽑는다', () => {
  assert.deepEqual(배정.map(x => x.번호), [1, 2, 3, 4, 6, 7, 9]);
  assert.equal(번호로(1).절, '보물');
  assert.equal(번호로(4).절, '야외봉사');
  assert.equal(번호로(7).절, '생활');
});

test('영적 보물 찾기와 회중 성서 연구는 연설이 아니다', () => {
  assert.equal(번호로(2).종류, '연설아님');
  assert.equal(번호로(9).종류, '연설아님');
});

test('시간을 초로 바꾼다', () => {
  assert.equal(번호로(1).시간초, 600);
  assert.equal(번호로(3).시간초, 240);
  assert.equal(번호로(4).시간초, 240);
  assert.equal(번호로(6).시간초, 300);
});

test('1번 보물 연설의 소제목 셋과 묵상을 뽑는다', () => {
  const 하나 = 번호로(1);

  assert.equal(하나.종류, '보물연설');
  assert.equal(하나.소제목.length, 3);
  assert.equal(하나.소제목[0].문장, '회개하는 유대인들은 마음을 다해 여호와를 찾을 것이었습니다');
  assert.ok(하나.묵상.startsWith('여호와께서 우리를 징계하실 때'));
});

test('삽화 설명을 소제목으로 세지 않는다', () => {
  assert.ok(!번호로(1).소제목.some(x => x.문장.includes('세 명의 장로')));
});

test('쪼개진 성구 앵커를 두 주소로 나눠 담는다', () => {
  const 셋째 = 번호로(1).소제목[2];

  assert.deepEqual(셋째.성구, ['렘 30:11', '히 12:6']);
  assert.deepEqual(셋째.출판물, [{ 표시: '「예레」 168면 2항', pc: '/ko/wol/pc/r8/lp-ko/202026248/2/0' }]);
});

test('소제목 문장에서 괄호 안 참조를 떼어 낸다', () => {
  const 첫째 = 번호로(1).소제목[0];

  assert.ok(!첫째.문장.includes('렘 29:12'));
  assert.ok(!첫째.문장.includes('「예레」'));
  assert.deepEqual(첫째.성구, ['렘 29:12, 13']);
});

test('성경 낭독의 범위와 지정 요점을 뽑는다', () => {
  const 셋 = 번호로(3);

  assert.equal(셋.종류, '성경낭독');
  assert.equal(셋.낭독범위, '렘 30:1-11');
  assert.deepEqual(셋.지정요점, { 책: '읽가', 과: 2, 요점: null });
});

test('시연의 봉사 형태와 요점 번호까지 뽑는다', () => {
  const 넷 = 번호로(4);

  assert.equal(넷.종류, '시연');
  assert.equal(넷.봉사형태, '호별 방문');
  assert.deepEqual(넷.지정요점, { 책: '랑제', 과: 3, 요점: 4 });
});

test('학생 연설을 시연과 구분한다', () => {
  const 여섯 = 번호로(6);

  assert.equal(여섯.종류, '학생연설');
  assert.equal(여섯.봉사형태, '');
  assert.deepEqual(여섯.지정요점, { 책: '읽가', 과: 1, 요점: null });
});

test('그리스도인 생활 항목은 생활부분이고 본문을 교재원문에 담는다', () => {
  const 일곱 = 번호로(7);

  assert.equal(일곱.종류, '생활부분');
  assert.ok(일곱.교재원문.includes('바빌론에 포로로'));
});

test('기존 parseMinistryMeeting 의 반환값이 그대로다', () => {
  // 설계 문서 14절이 요구하는 회귀 방지다. 파수대 예습과 생활과 봉사 답변 생성이
  // 이 함수를 이미 쓰고 있으므로 모양이 바뀌면 두 기능이 조용히 깨진다.
  const 결과 = parseMinistryMeeting(교재원본);

  assert.deepEqual(Object.keys(결과).sort(), ['성경범위', '영적보물질문', '주라벨', '회중성서연구']);
  assert.ok(Array.isArray(결과.영적보물질문));
  assert.equal(결과.회중성서연구.서책명, '용하');
  assert.equal(결과.회중성서연구.장, 5);
});
```

`parseMinistryMeeting`을 부르려면 픽스처가 그 함수가 찾는 `h2`와 `h3`를 모두 가져야 한다. 위 픽스처가 이미 갖고 있으므로 import 두 줄만 더한다.

```js
import { parseMinistryMeeting } from './ministry-meeting.mjs';

const 교재원본 = html;
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-assignments.test.mjs`
Expected: FAIL. `Cannot find module './talk-assignments.mjs'`.

- [ ] **Step 4: 최소 구현을 쓴다**

`src/talk-assignments.mjs`

```js
// 그 주 「생활과 봉사」 교재에서 연설 배정 항목을 뽑는 모듈
import { 요소들, 링크들, 텍스트 } from './wol-html.mjs';

const 절이름 = [
  { 정규식: /성경에 담긴 보물/, 값: '보물' },
  { 정규식: /야외 봉사/, 값: '야외봉사' },
  { 정규식: /그리스도인 생활/, 값: '생활' },
];

const 연설아님 = /영적 보물 찾기|회중 성서 연구|노래|맺음말|여는 말/;

function 절판정(제목) {
  return 절이름.find(x => x.정규식.test(제목))?.값 ?? null;
}

function 분초(문장) {
  const m = 문장.match(/^\s*\((\d+)분\)/);
  return m ? Number(m[1]) * 60 : 0;
}

function 요점읽기(본문) {
  const m = 텍스트(본문).match(/「(읽가|랑제)」\s*(\d+)과(?:\s*요점\s*(\d+))?/);
  if (!m) return null;
  return { 책: m[1], 과: Number(m[2]), 요점: m[3] ? Number(m[3]) : null };
}

function 참조가르기(본문) {
  const 성구 = [];
  const 출판물 = [];
  for (const 링크 of 링크들(본문)) {
    const 표시 = 링크.텍스트.trim().replace(/[;,]\s*$/, '');
    if (!표시) continue;
    if (링크.href.includes('/bc/')) 성구.push(표시);
    else if (링크.href.includes('/pc/')) 출판물.push({ 표시, pc: 링크.href });
  }
  return { 성구, 출판물 };
}

function 괄호떼기(문장) {
  return 문장.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

function 종류판정(절, 제목, 첫문장) {
  if (연설아님.test(제목)) return '연설아님';
  if (절 === '보물') return '보물연설';
  if (/성경 낭독/.test(제목)) return '성경낭독';
  if (절 === '생활') return '생활부분';
  if (/^연설$/.test(제목.trim())) return '학생연설';
  return /토의|연설/.test(첫문장) ? '학생연설' : '시연';
}

function 봉사형태읽기(설명) {
  const m = 설명.match(/^(호별 방문|공개 증거|비공식 증거|전화 증거|재방문)\s*\./);
  return m ? m[1] : '';
}

export function parseTalkAssignments(html) {
  const blocks = 요소들(html, ['h2', 'h3', 'p', 'li']);
  const 항목들 = [];
  let 절 = null;
  let 현재 = null;

  for (const b of blocks) {
    if (b.태그 === 'h2') {
      const 다음절 = 절판정(b.텍스트);
      if (다음절) 절 = 다음절;
      현재 = null;
      continue;
    }

    if (b.태그 === 'h3') {
      현재 = null;
      const m = b.텍스트.match(/^\s*(\d+)\.\s*(.+)$/);
      if (!m || !절) continue;
      현재 = {
        번호: Number(m[1]), 제목: m[2].trim(), 절, 종류: '', 시간초: 0,
        봉사형태: '', 설명: '', 지정요점: null, 소제목: [], 묵상: '',
        낭독범위: '', 교재원문: '',
      };
      항목들.push(현재);
      continue;
    }

    if (!현재) continue;

    if (!현재.시간초 && /^\s*\(\d+분\)/.test(b.텍스트)) {
      현재.시간초 = 분초(b.텍스트);
      현재.설명 = b.텍스트.replace(/^\s*\(\d+분\)\s*/, '').trim();
      현재.봉사형태 = 봉사형태읽기(현재.설명);
      현재.지정요점 = 요점읽기(b.본문);
      const { 성구 } = 참조가르기(b.본문);
      현재.종류 = 종류판정(현재.절, 현재.제목, 현재.설명);
      if (현재.종류 === '성경낭독') 현재.낭독범위 = 성구[0] ?? '';
      continue;
    }

    if (/^\s*묵상해 볼 점/.test(b.텍스트)) {
      현재.묵상 = b.텍스트.replace(/^\s*묵상해 볼 점\s*:?\s*/, '').trim();
      continue;
    }

    if (현재.종류 === '보물연설' && b.태그 === 'p') {
      const { 성구, 출판물 } = 참조가르기(b.본문);
      현재.소제목.push({ 문장: 괄호떼기(b.텍스트), 성구, 출판물 });
      continue;
    }

    현재.교재원문 = `${현재.교재원문}${현재.교재원문 ? '\n' : ''}${b.텍스트}`;
  }

  for (const 항목 of 항목들) if (!항목.종류) 항목.종류 = 종류판정(항목.절, 항목.제목, '');
  return 항목들;
}
```

- [ ] **Step 5: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-assignments.test.mjs`
Expected: PASS 11개.

실패하면 `요소들`이 `figure`와 `img`를 어떻게 다루는지 먼저 확인한다. `src/wol-html.mjs:11`의 기본 태그 목록에 `figure`가 없으므로 삽화는 애초에 블록으로 잡히지 않아야 한다. 잡힌다면 그것이 원인이다.

- [ ] **Step 6: 커밋한다**

```bash
git add src/talk-assignments.mjs src/talk-assignments.test.mjs tests/fixtures/교재-배정.html
git commit -m "교재에서 연설 배정 항목을 뽑는다"
```

---

### Task 4: 자격 게이트

**Files:**
- Create: `src/talk-profile.mjs`
- Create: `src/talk-profile.test.mjs`

**Interfaces:**
- Consumes: 배정 원소의 `종류` 필드 (과제 3).
- Produces:
  - `기본프로필()` → `{ 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 }`.
  - `자격판정(프로필, 종류)` → `{ 가능: boolean, 사유: string }`. 가능하면 사유는 빈 문자열.
  - `배정에게이트적용(프로필, 배정목록)` → 각 원소에 `가능`과 `사유`를 더한 새 배열. 원본을 바꾸지 않는다.
  - `스타일목록` → `['논리형', '설득형', '이야기형', '따뜻한 격려형', '질문형']`.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-profile.test.mjs`

```js
// 화자 프로필과 자격 게이트를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 기본프로필, 자격판정, 배정에게이트적용 } from './talk-profile.mjs';

const 프로필 = 덮어쓰기 => ({ ...기본프로필(), ...덮어쓰기 });

test('자매는 시연만 할 수 있다', () => {
  const 자매 = 프로필({ 성별: '자매' });

  assert.equal(자격판정(자매, '시연').가능, true);
  assert.equal(자격판정(자매, '성경낭독').가능, false);
  assert.equal(자격판정(자매, '학생연설').가능, false);
  assert.equal(자격판정(자매, '보물연설').가능, false);
  assert.equal(자격판정(자매, '생활부분').가능, false);
  assert.equal(자격판정(자매, '공개강연').가능, false);
});

test('미임명 형제는 학생 과제만 할 수 있다', () => {
  const 형제 = 프로필({ 성별: '형제', 임명: '미임명' });

  assert.equal(자격판정(형제, '시연').가능, true);
  assert.equal(자격판정(형제, '성경낭독').가능, true);
  assert.equal(자격판정(형제, '학생연설').가능, true);
  assert.equal(자격판정(형제, '보물연설').가능, false);
  assert.equal(자격판정(형제, '생활부분').가능, false);
  assert.equal(자격판정(형제, '공개강연').가능, false);
});

test('장로와 봉사의 종은 모두 할 수 있다', () => {
  for (const 임명 of ['장로', '봉사의 종']) {
    const 형제 = 프로필({ 임명 });
    for (const 종류 of ['시연', '성경낭독', '학생연설', '보물연설', '생활부분', '공개강연']) {
      assert.equal(자격판정(형제, 종류).가능, true, `${임명} ${종류}`);
    }
  }
}); 

test('파이오니아 여부는 자격을 바꾸지 않는다', () => {
  const 가 = 자격판정(프로필({ 임명: '미임명', 파이오니아: true }), '보물연설');
  const 나 = 자격판정(프로필({ 임명: '미임명', 파이오니아: false }), '보물연설');

  assert.equal(가.가능, 나.가능);
});

test('막힌 배정에는 사유가 붙는다', () => {
  const 자매 = 프로필({ 성별: '자매' });

  assert.match(자격판정(자매, '학생연설').사유, /자매/);
  assert.equal(자격판정(자매, '시연').사유, '');
});

test('연설아님은 언제나 막힌다', () => {
  assert.equal(자격판정(프로필({ 임명: '장로' }), '연설아님').가능, false);
});

test('배정 목록에 게이트를 씌우고 원본을 바꾸지 않는다', () => {
  const 배정 = [{ 번호: 1, 종류: '보물연설' }, { 번호: 4, 종류: '시연' }];
  const 결과 = 배정에게이트적용(프로필({ 임명: '미임명' }), 배정);

  assert.equal(결과[0].가능, false);
  assert.equal(결과[1].가능, true);
  assert.equal(배정[0].가능, undefined);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-profile.test.mjs`
Expected: FAIL. `Cannot find module './talk-profile.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

자격표는 상수 하나에 모은다. 설계 문서 4절이 다른 회중의 마련이 다를 수 있으므로 한곳에서 고칠 수 있게 하라고 요구한다.

`src/talk-profile.mjs`

```js
// 화자 프로필과 연설 종류별 자격 게이트를 다루는 모듈
export const 스타일목록 = ['논리형', '설득형', '이야기형', '따뜻한 격려형', '질문형'];
export const 임명목록 = ['장로', '봉사의 종', '미임명'];

// 광주양림회중의 마련을 2026-08-25에 김동언 형제가 확인해 준 표다.
// 다른 회중의 마련이 다를 수 있으므로 고칠 곳은 여기 한 군데다.
const 자격표 = {
  시연: { 성별: ['형제', '자매'], 임명: 임명목록 },
  성경낭독: { 성별: ['형제'], 임명: 임명목록 },
  학생연설: { 성별: ['형제'], 임명: 임명목록 },
  보물연설: { 성별: ['형제'], 임명: ['장로', '봉사의 종'] },
  생활부분: { 성별: ['형제'], 임명: ['장로', '봉사의 종'] },
  공개강연: { 성별: ['형제'], 임명: ['장로', '봉사의 종'] },
};

export function 기본프로필() {
  return { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };
}

export function 자격판정(프로필, 종류) {
  const 규칙 = 자격표[종류];
  if (!규칙) return { 가능: false, 사유: '연설 배정이 아닙니다.' };
  if (!규칙.성별.includes(프로필.성별)) return { 가능: false, 사유: '자매에게는 배정되지 않는 항목입니다.' };
  if (!규칙.임명.includes(프로필.임명)) return { 가능: false, 사유: '장로나 봉사의 종에게 배정되는 항목입니다.' };
  return { 가능: true, 사유: '' };
}

export function 배정에게이트적용(프로필, 배정목록) {
  return 배정목록.map(배정 => ({ ...배정, ...자격판정(프로필, 배정.종류) }));
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-profile.test.mjs`
Expected: PASS 7개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-profile.mjs src/talk-profile.test.mjs
git commit -m "화자 프로필과 자격 게이트를 만든다"
```

---

### Task 5: 시간 계산

**Files:**
- Create: `src/talk-timing.mjs`
- Create: `src/talk-timing.test.mjs`

**Interfaces:**
- Consumes: 원고 구조체의 `대사`, `단락`, `축약순서`, `배정시간`.
- Produces:
  - `추정초(구조체, 설정)` → number. `설정`은 `{ 분당글자수, 성구계수, 동작초 }`이며 기본은 `{ 분당글자수: 320, 성구계수: 0.85, 동작초: 1.5 }`.
  - `시간보고(구조체, 설정)` → `{ 총초, 배정초, 초과, 축약적용: [{ 순위, 총초 }] }`. `초과`는 `총초 - 배정초`이며 음수일 수 있다.
  - `분초표기(초)` → `'4분 38초'` 형태의 string.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-timing.test.mjs`

```js
// 낭독 시간 계산과 축약 제안을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 추정초, 시간보고, 분초표기 } from './talk-timing.mjs';

const 설정 = { 분당글자수: 300, 성구계수: 0.5, 동작초: 2 };

function 구조체(덮어쓰기 = {}) {
  return {
    배정시간: 240, 대사: [], 단락: [], 성구: [], 축약순서: [],
    ...덮어쓰기,
  };
}

test('대사 글자 수를 초로 바꾼다', () => {
  const 하나 = 구조체({ 대사: [{ 구간: '가', 화자: '전도인', 말: '가'.repeat(150), 동작: '', 요점표시: '' }] });

  // 150자 / (300자 per 60초) = 30초
  assert.equal(추정초(하나, 설정), 30);
});

test('동작 지시는 글자 수가 아니라 고정 시간으로 센다', () => {
  const 없음 = 구조체({ 대사: [{ 구간: '가', 화자: '전도인', 말: '가'.repeat(150), 동작: '', 요점표시: '' }] });
  const 있음 = 구조체({ 대사: [{ 구간: '가', 화자: '전도인', 말: '가'.repeat(150), 동작: '반걸음 물러선다', 요점표시: '' }] });

  assert.equal(추정초(있음, 설정) - 추정초(없음, 설정), 2);
});

test('성구 낭독은 계수만큼 느리게 센다', () => {
  const 하나 = 구조체({ 성구: [{ 주소: '렘 29:11', 본문: '가'.repeat(150) }] });

  // 150자를 0.5 계수로 = 300자어치 = 60초
  assert.equal(추정초(하나, 설정), 60);
});

test('단락의 요점과 예화와 적용도 글자 수로 센다', () => {
  const 하나 = 구조체({
    단락: [{ 소제목: '가'.repeat(30), 출처: '교재', 요점: ['나'.repeat(60)], 예화: '다'.repeat(30), 적용: '라'.repeat(30), 성구주소: [] }],
  });

  assert.equal(추정초(하나, 설정), 30);
});

test('배정 시간과 초과분을 함께 보고한다', () => {
  const 하나 = 구조체({ 배정시간: 240, 대사: [{ 구간: '가', 화자: '전도인', 말: '가'.repeat(1500), 동작: '', 요점표시: '' }] });
  const 보고 = 시간보고(하나, 설정);

  assert.equal(보고.총초, 300);
  assert.equal(보고.배정초, 240);
  assert.equal(보고.초과, 60);
});

test('시간이 남으면 초과가 음수다', () => {
  const 하나 = 구조체({ 배정시간: 240, 대사: [{ 구간: '가', 화자: '전도인', 말: '가'.repeat(150), 동작: '', 요점표시: '' }] });

  assert.equal(시간보고(하나, 설정).초과, -210);
});

test('축약 순위를 하나씩 적용한 예상 시간을 낸다', () => {
  const 하나 = 구조체({
    배정시간: 240,
    대사: [
      { 구간: '가', 화자: '전도인', 말: '가'.repeat(900), 동작: '', 요점표시: '' },
      { 구간: '나', 화자: '전도인', 말: '나'.repeat(300), 동작: '', 요점표시: '' },
      { 구간: '다', 화자: '전도인', 말: '다'.repeat(300), 동작: '', 요점표시: '' },
    ],
    축약순서: [
      { 순위: 1, 대상: '나', 사유: '없어도 뜻이 통한다' },
      { 순위: 2, 대상: '다', 사유: '앞에서 이미 말했다' },
    ],
  });
  const 보고 = 시간보고(하나, 설정);

  assert.equal(보고.총초, 300);
  assert.deepEqual(보고.축약적용, [{ 순위: 1, 총초: 240 }, { 순위: 2, 총초: 180 }]);
});

test('교재에서 온 단락은 축약 대상이 되지 않는다', () => {
  const 하나 = 구조체({
    배정시간: 240,
    단락: [{ 소제목: '가'.repeat(300), 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [] }],
    축약순서: [{ 순위: 1, 대상: '가'.repeat(300), 사유: '길다' }],
  });
  const 보고 = 시간보고(하나, 설정);

  assert.equal(보고.축약적용[0].총초, 보고.총초);
});

test('초를 사람이 읽는 표기로 바꾼다', () => {
  assert.equal(분초표기(278), '4분 38초');
  assert.equal(분초표기(240), '4분 0초');
  assert.equal(분초표기(45), '0분 45초');
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-timing.test.mjs`
Expected: FAIL. `Cannot find module './talk-timing.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

`src/talk-timing.mjs`

```js
// 원고의 낭독 시간을 글자 수로 계산하고 축약 효과를 보고하는 모듈
export const 기본설정 = { 분당글자수: 320, 성구계수: 0.85, 동작초: 1.5 };

function 글자수(문장) {
  return String(문장 ?? '').replace(/\s/g, '').length;
}

function 초로(수, 분당글자수) {
  return 수 / (분당글자수 / 60);
}

function 축약된대상(구조체, 순위) {
  const 지울것 = new Set(
    (구조체.축약순서 ?? []).filter(x => x.순위 <= 순위).map(x => x.대상),
  );
  const 남은대사 = (구조체.대사 ?? []).filter(x => !지울것.has(x.구간) && !지울것.has(x.말));
  // 교재와 개요에서 온 단락은 문장을 고치지 않으므로 축약하지 않는다.
  const 남은단락 = (구조체.단락 ?? []).filter(
    x => x.출처 !== '생성' ? true : !지울것.has(x.소제목),
  );
  return { ...구조체, 대사: 남은대사, 단락: 남은단락 };
}

export function 추정초(구조체, 설정 = 기본설정) {
  const { 분당글자수, 성구계수, 동작초 } = { ...기본설정, ...설정 };
  let 초 = 0;

  for (const 대사 of 구조체.대사 ?? []) {
    초 += 초로(글자수(대사.말), 분당글자수);
    if (String(대사.동작 ?? '').trim()) 초 += 동작초;
  }

  for (const 단락 of 구조체.단락 ?? []) {
    const 수 = 글자수(단락.소제목) + (단락.요점 ?? []).reduce((합, x) => 합 + 글자수(x), 0)
      + 글자수(단락.예화) + 글자수(단락.적용);
    초 += 초로(수, 분당글자수);
  }

  for (const 성구 of 구조체.성구 ?? []) {
    초 += 초로(글자수(성구.본문), 분당글자수 * 성구계수);
  }

  return Math.round(초);
}

export function 시간보고(구조체, 설정 = 기본설정) {
  const 총초 = 추정초(구조체, 설정);
  const 순위들 = [...new Set((구조체.축약순서 ?? []).map(x => x.순위))].sort((가, 나) => 가 - 나);
  return {
    총초,
    배정초: 구조체.배정시간 ?? 0,
    초과: 총초 - (구조체.배정시간 ?? 0),
    축약적용: 순위들.map(순위 => ({ 순위, 총초: 추정초(축약된대상(구조체, 순위), 설정) })),
  };
}

export function 분초표기(초) {
  const 값 = Math.max(0, Math.round(초));
  return `${Math.floor(값 / 60)}분 ${값 % 60}초`;
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-timing.test.mjs`
Expected: PASS 9개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-timing.mjs src/talk-timing.test.mjs
git commit -m "낭독 시간을 글자 수로 계산한다"
```

---

### Task 6: 성구 치환과 검증

**Files:**
- Create: `src/talk-verses.mjs`
- Create: `src/talk-verses.test.mjs`

**Interfaces:**
- Consumes: `parseReference(index, text)` (`src/verse-address.mjs:38`), `createTools(root)` (`src/prep-service.mjs:18`). 두 함수 모두 이미 존재한다. `parseReference`는 index 를 **첫** 인자로 받는다. `createTextReader`도 index 가 먼저다. 인자 순서를 뒤집지 않는다.
- Produces:
  - `성구채우기(구조체, 읽기)` → 새 구조체. `읽기`는 `주소 → 본문|null` 함수이며 테스트에서 가짜를 넣는다. 해석 실패한 주소는 `성구` 배열에서 본문이 빈 문자열이 되고 `경고`에 한 줄이 붙는다.
  - `모델성구검사(구조체)` → `{ 통과: boolean, 위반: [string] }`. 모델이 인용부호 안에 성경 문장을 직접 쓴 대사를 잡아낸다.
  - `성구읽기만들기(루트)` → `주소 → 본문|null`. 실제 로컬 본문을 읽는다. 네트워크를 쓰지 않는다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-verses.test.mjs`

```js
// 성구 주소 치환과 모델 성구 위반 검사를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 성구채우기, 모델성구검사 } from './talk-verses.mjs';

const 가짜읽기 = 주소 => (주소 === '예레미야 29:11' ? '내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다.' : null);

function 구조체(덮어쓰기 = {}) {
  return { 대사: [], 단락: [], 성구: [], 경고: [], ...덮어쓰기 };
}

test('유효한 주소를 로컬 본문으로 채운다', () => {
  const 결과 = 성구채우기(구조체({ 성구: [{ 주소: '예레미야 29:11', 본문: '' }] }), 가짜읽기);

  assert.equal(결과.성구[0].본문, '내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다.');
  assert.deepEqual(결과.경고, []);
});

test('모델이 써 넣은 본문을 덮어쓴다', () => {
  const 결과 = 성구채우기(구조체({ 성구: [{ 주소: '예레미야 29:11', 본문: '모델이 지어낸 문장이다.' }] }), 가짜읽기);

  assert.equal(결과.성구[0].본문, '내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다.');
});

test('해석 못 한 주소는 본문을 비우고 경고를 남긴다', () => {
  const 결과 = 성구채우기(구조체({ 성구: [{ 주소: '없는책 1:1', 본문: '모델이 지어낸 문장이다.' }] }), 가짜읽기);

  assert.equal(결과.성구[0].본문, '');
  assert.equal(결과.경고.length, 1);
  assert.match(결과.경고[0], /성구 자동 확인 실패/);
  assert.match(결과.경고[0], /없는책 1:1/);
});

test('단락의 성구주소도 성구 배열로 모은다', () => {
  const 결과 = 성구채우기(구조체({
    단락: [{ 소제목: '가', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: ['예레미야 29:11'] }],
  }), 가짜읽기);

  assert.equal(결과.성구.length, 1);
  assert.equal(결과.성구[0].주소, '예레미야 29:11');
});

test('같은 주소를 두 번 담지 않는다', () => {
  const 결과 = 성구채우기(구조체({
    성구: [{ 주소: '예레미야 29:11', 본문: '' }],
    단락: [{ 소제목: '가', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: ['예레미야 29:11'] }],
  }), 가짜읽기);

  assert.equal(결과.성구.length, 1);
});

test('대사 안 자리표시자를 로컬 본문으로 바꾼다', () => {
  const 결과 = 성구채우기(구조체({
    대사: [{ 구간: '성구', 화자: '전도인', 말: '읽어 드리겠습니다. {{성구:예레미야 29:11}}', 동작: '', 요점표시: '' }],
    성구: [{ 주소: '예레미야 29:11', 본문: '' }],
  }), 가짜읽기);

  assert.equal(결과.대사[0].말, '읽어 드리겠습니다. “내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다.”');
});

test('모델이 인용부호 안에 성경 문장을 쓰면 위반으로 잡는다', () => {
  const 검사 = 모델성구검사(구조체({
    대사: [{ 구간: '성구', 화자: '전도인', 말: '“내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다.” 여호와의 말이다.', 동작: '', 요점표시: '' }],
    성구: [{ 주소: '예레미야 29:11', 본문: '' }],
  }));

  assert.equal(검사.통과, false);
  assert.equal(검사.위반.length, 1);
});

test('자리표시자를 쓴 대사는 위반이 아니다', () => {
  const 검사 = 모델성구검사(구조체({
    대사: [{ 구간: '성구', 화자: '전도인', 말: '{{성구:예레미야 29:11}}', 동작: '', 요점표시: '' }],
    성구: [{ 주소: '예레미야 29:11', 본문: '' }],
  }));

  assert.equal(검사.통과, true);
});

test('짧은 인용부호는 위반이 아니다', () => {
  const 검사 = 모델성구검사(구조체({
    대사: [{ 구간: '화제', 화자: '집주인', 말: '그런 건 좀 “종교” 얘기 아닌가요.', 동작: '', 요점표시: '' }],
  }));

  assert.equal(검사.통과, true);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-verses.test.mjs`
Expected: FAIL. `Cannot find module './talk-verses.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

모델 위반 판정은 길이 기준이다. 인용부호 안이 40자를 넘으면 성경 문장을 쓴 것으로 본다. 40자는 실물 원고의 성구 낭독과 일상 대화의 인용을 가르는 값이다.

`src/talk-verses.mjs`

```js
// 원고 구조체의 성구를 로컬 본문으로만 채우고 모델의 성구 서술을 막는 모듈
import { parseReference } from './verse-address.mjs';
import { createTools } from './prep-service.mjs';

const 자리표시자 = /\{\{성구:([^}]+)\}\}/g;
const 긴인용 = /[“"]([^”"]{40,})[”"]/g;

function 주소모으기(구조체) {
  const 주소들 = [];
  for (const 성구 of 구조체.성구 ?? []) if (성구.주소) 주소들.push(성구.주소);
  for (const 단락 of 구조체.단락 ?? []) for (const 주소 of 단락.성구주소 ?? []) 주소들.push(주소);
  for (const 대사 of 구조체.대사 ?? []) {
    for (const m of String(대사.말 ?? '').matchAll(자리표시자)) 주소들.push(m[1].trim());
  }
  if (구조체.주제성구?.주소) 주소들.push(구조체.주제성구.주소);
  return [...new Set(주소들)];
}

export function 성구채우기(구조체, 읽기) {
  const 경고 = [...(구조체.경고 ?? [])];
  const 본문맵 = new Map();
  const 성구 = [];

  for (const 주소 of 주소모으기(구조체)) {
    let 본문 = '';
    try {
      본문 = 읽기(주소) ?? '';
    } catch {
      본문 = '';
    }
    if (!본문) 경고.push(`성구 자동 확인 실패 — ${주소}`);
    본문맵.set(주소, 본문);
    성구.push({ 주소, 본문 });
  }

  const 대사 = (구조체.대사 ?? []).map(대사 => ({
    ...대사,
    말: String(대사.말 ?? '').replace(자리표시자, (전체, 주소) => {
      const 본문 = 본문맵.get(주소.trim());
      return 본문 ? `“${본문}”` : 전체;
    }),
  }));

  const 주제성구 = 구조체.주제성구?.주소
    ? { 주소: 구조체.주제성구.주소, 본문: 본문맵.get(구조체.주제성구.주소) ?? '' }
    : (구조체.주제성구 ?? null);

  return { ...구조체, 대사, 성구, 주제성구, 경고 };
}

export function 모델성구검사(구조체) {
  const 위반 = [];
  for (const 대사 of 구조체.대사 ?? []) {
    const 말 = String(대사.말 ?? '');
    for (const m of 말.matchAll(긴인용)) {
      위반.push(`모델이 성구 문장을 직접 썼다 — ${m[1].slice(0, 40)}`);
    }
  }
  return { 통과: 위반.length === 0, 위반 };
}

// 두 함수 모두 index 를 첫 인자로 받는다. src/verse-address.mjs:38 과 src/bible-text.mjs:6 이다.
// createTools 가 이미 index 와 text 를 함께 만들어 주므로 그것을 쓴다.
export function 성구읽기만들기(루트) {
  const { index, text } = createTools(루트);
  return 주소 => {
    try {
      const 참조 = parseReference(index, 주소);
      if (!참조) return null;
      return text(참조);
    } catch {
      return null;
    }
  };
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-verses.test.mjs`
Expected: PASS 9개.

`성구읽기만들기`는 테스트에서 부르지 않는다. `text(참조)`가 무엇을 돌려주는지는 `scripts/lookup.mjs`가 실제로 쓰는 모양을 보고 맞춘다. 문자열이 아니라 객체나 배열이면 그 자리에서 문자열로 합친다.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-verses.mjs src/talk-verses.test.mjs
git commit -m "성구를 로컬 본문으로만 채운다"
```

---

### Task 7: 산출물 네 개 렌더

**Files:**
- Create: `src/talk-render.mjs`
- Create: `src/talk-render.test.mjs`

**Interfaces:**
- Consumes: `시간보고`, `분초표기` (과제 5).
- Produces: `renderTalk(구조체, 설정)` → `{ 준비원고, 낭독대본, 큐카드, 점검표 }`. 넷 다 마크다운 string이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-render.test.mjs`

```js
// 원고 구조체에서 산출물 네 개를 깎아 내는 렌더를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderTalk } from './talk-render.mjs';

const 시연 = {
  제목: '대화 시작하기 — 호별 방문',
  종류: '시연',
  배정시간: 240,
  지정요점: { 책: '랑제', 과: 3, 요점: 4, 제목: '친절', 요점본문: '친절하고 존중심 있게 말하십시오.' },
  주제성구: null,
  설정: { 등장인물: [{ 역할: '전도인', 설명: '배정된 형제' }], 상황: '토요일 오전 현관', 준비물: ['팜플렛'] },
  구간: [{ 이름: '여는 인사', 시작초: 0, 끝초: 25, 목적: '이름을 밝힌다' }],
  대사: [
    { 구간: '여는 인사', 화자: '전도인', 말: '안녕하세요.', 동작: '반걸음 물러선다', 요점표시: '어조를 낮춰 요점 4를 보인다' },
    { 구간: '여는 인사', 화자: '집주인', 말: '무슨 일이시죠.', 동작: '', 요점표시: '' },
  ],
  단락: [],
  성구: [{ 주소: '예레미야 29:11', 본문: '미래와 희망을 갖게 하려는 것이다.' }],
  축약순서: [{ 순위: 1, 대상: '여는 인사', 사유: '없어도 뜻이 통한다' }],
  출처: [{ 제목: '「랑제」 3과', url: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1102023303', 조회일: '2026-08-25' }],
  경고: [],
};

const 연설 = {
  ...시연,
  제목: '여호와께서는 자신의 종들을 적절한 정도로 징계하십니다',
  종류: '보물연설',
  배정시간: 600,
  설정: null,
  대사: [],
  단락: [
    { 소제목: '회개하는 유대인들은 여호와를 찾을 것이었습니다', 출처: '교재', 요점: ['징계에는 목적이 있다'], 예화: '자녀를 훈계하는 부모', 적용: '우리도 그렇게 반응한다', 성구주소: ['예레미야 29:11'] },
  ],
};

test('준비용 원고에 설정과 시간 배분과 출처가 다 들어간다', () => {
  const { 준비원고 } = renderTalk(시연);

  assert.match(준비원고, /대화 시작하기 — 호별 방문/);
  assert.match(준비원고, /토요일 오전 현관/);
  assert.match(준비원고, /팜플렛/);
  assert.match(준비원고, /여는 인사/);
  assert.match(준비원고, /「랑제」 3과/);
  assert.match(준비원고, /2026-08-25/);
});

test('낭독용 대본에는 대사와 동작만 남고 배경은 빠진다', () => {
  const { 낭독대본 } = renderTalk(시연);

  assert.match(낭독대본, /안녕하세요\./);
  assert.match(낭독대본, /반걸음 물러선다/);
  assert.ok(!낭독대본.includes('없어도 뜻이 통한다'));
  assert.ok(!낭독대본.includes('2026-08-25'));
});

test('큐카드에는 성구 주소가 있고 성구 본문은 없다', () => {
  const { 큐카드 } = renderTalk(연설);

  assert.match(큐카드, /예레미야 29:11/);
  assert.ok(!큐카드.includes('미래와 희망을 갖게 하려는 것이다'));
});

test('큐카드의 요점은 모두 준비용 원고에도 있다', () => {
  const { 큐카드, 준비원고 } = renderTalk(연설);

  for (const 요점 of 연설.단락[0].요점) {
    assert.ok(큐카드.includes(요점), `큐카드에 없다 — ${요점}`);
    assert.ok(준비원고.includes(요점), `원고에 없다 — ${요점}`);
  }
});

test('자기 점검표는 지정 요점과 요점표시가 붙은 대목을 짝지어 보인다', () => {
  const { 점검표 } = renderTalk(시연);

  assert.match(점검표, /「랑제」 3과 요점 4/);
  assert.match(점검표, /친절하고 존중심 있게 말하십시오/);
  assert.match(점검표, /어조를 낮춰 요점 4를 보인다/);
});

test('요점표시가 하나도 없으면 점검표가 그 사실을 경고한다', () => {
  const { 점검표 } = renderTalk({ ...시연, 대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '안녕하세요.', 동작: '', 요점표시: '' }] });

  assert.match(점검표, /지정 요점을 드러내는 대목이 없습니다/);
});

test('네 산출물 모두 예상 시간을 같은 값으로 적는다', () => {
  const { 준비원고, 낭독대본, 큐카드, 점검표 } = renderTalk(시연);
  const 꺼내기 = 글 => (글.match(/예상 (\d+분 \d+초)/) || [])[1];

  const 값 = 꺼내기(준비원고);
  assert.ok(값);
  assert.equal(꺼내기(낭독대본), 값);
  assert.equal(꺼내기(큐카드), 값);
  assert.equal(꺼내기(점검표), 값);
});

test('경고가 있으면 준비용 원고 맨 위에 뜬다', () => {
  const { 준비원고 } = renderTalk({ ...시연, 경고: ['성구 자동 확인 실패 — 없는책 1:1'] });

  assert.match(준비원고.split('\n').slice(0, 8).join('\n'), /성구 자동 확인 실패/);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-render.test.mjs`
Expected: FAIL. `Cannot find module './talk-render.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

`src/talk-render.mjs`

```js
// 원고 구조체 하나에서 준비용 원고, 낭독용 대본, 연단 큐카드, 자기 점검표를 만드는 모듈
import { 기본설정, 시간보고, 분초표기 } from './talk-timing.mjs';

function 머리(구조체, 보고) {
  return [
    `# ${구조체.제목}`,
    '',
    `${구조체.종류} · 배정 ${분초표기(구조체.배정시간)} · 예상 ${분초표기(보고.총초)}`,
  ];
}

function 경고줄(구조체) {
  if (!(구조체.경고 ?? []).length) return [];
  return ['', '> ⚠ ' + 구조체.경고.join('\n> ⚠ ')];
}

function 요점표기(지정요점) {
  if (!지정요점) return '';
  const 꼬리 = 지정요점.요점 ? ` 요점 ${지정요점.요점}` : '';
  return `「${지정요점.책}」 ${지정요점.과}과${꼬리}`;
}

function 준비원고쓰기(구조체, 보고) {
  const 줄 = [...머리(구조체, 보고), ...경고줄(구조체)];

  if (구조체.지정요점) {
    줄.push('', '## 지정 요점', '', `${요점표기(구조체.지정요점)} — ${구조체.지정요점.제목}`, '', `> ${구조체.지정요점.요점본문}`);
  }

  if (구조체.설정) {
    줄.push('', '## 설정', '');
    for (const 사람 of 구조체.설정.등장인물 ?? []) 줄.push(`- **${사람.역할}** — ${사람.설명}`);
    if (구조체.설정.상황) 줄.push(`- **상황** — ${구조체.설정.상황}`);
    if ((구조체.설정.준비물 ?? []).length) 줄.push(`- **준비물** — ${구조체.설정.준비물.join(', ')}`);
  }

  if ((구조체.구간 ?? []).length) {
    줄.push('', '## 시간 배분', '', '| 구간 | 분량 | 목적 |', '| --- | --- | --- |');
    for (const 구간 of 구조체.구간) {
      줄.push(`| ${구간.이름} | ${분초표기(구간.시작초)}~${분초표기(구간.끝초)} | ${구간.목적} |`);
    }
  }

  if ((구조체.단락 ?? []).length) {
    줄.push('', '## 원고', '');
    for (const 단락 of 구조체.단락) {
      줄.push(`### ${단락.소제목}`, '', `출처는 ${단락.출처}다.`, '');
      for (const 요점 of 단락.요점 ?? []) 줄.push(`- ${요점}`);
      if (단락.예화) 줄.push('', `예화. ${단락.예화}`);
      if (단락.적용) 줄.push('', `적용. ${단락.적용}`);
      if ((단락.성구주소 ?? []).length) 줄.push('', `성구. ${단락.성구주소.join(' · ')}`);
      줄.push('');
    }
  }

  if ((구조체.대사 ?? []).length) {
    줄.push('', '## 원고', '');
    let 앞구간 = null;
    for (const 대사 of 구조체.대사) {
      if (대사.구간 !== 앞구간) {
        줄.push(`### ${대사.구간}`, '');
        앞구간 = 대사.구간;
      }
      줄.push(`**${대사.화자}**: ${대사.동작 ? `(${대사.동작}) ` : ''}${대사.말}`, '');
      if (대사.요점표시) 줄.push(`> 〔요점〕 ${대사.요점표시}`, '');
    }
  }

  if ((구조체.성구 ?? []).length) {
    줄.push('', '## 성구', '');
    for (const 성구 of 구조체.성구) {
      줄.push(`- **${성구.주소}** ${성구.본문 || '— 성구 자동 확인 실패'}`);
    }
  }

  if ((구조체.축약순서 ?? []).length) {
    줄.push('', '## 시간을 넘길 때 먼저 줄일 곳', '');
    for (const 축약 of [...구조체.축약순서].sort((가, 나) => 가.순위 - 나.순위)) {
      const 예상 = 보고.축약적용.find(x => x.순위 === 축약.순위);
      줄.push(`${축약.순위}. ${축약.대상} — ${축약.사유}${예상 ? ` (적용하면 ${분초표기(예상.총초)})` : ''}`);
    }
  }

  if ((구조체.출처 ?? []).length) {
    줄.push('', '## 출처', '');
    for (const 출처 of 구조체.출처) 줄.push(`- ${출처.제목}. ${출처.url} (조회일 ${출처.조회일})`);
    줄.push('', '성구 본문은 `core/bible/text/` 신세계역에서 실제로 읽은 문장이다.');
  }

  return `${줄.join('\n').trim()}\n`;
}

function 낭독대본쓰기(구조체, 보고) {
  const 줄 = [...머리(구조체, 보고), '', '두 사람이 각자 들고 읽는 용도다. 배경과 근거는 준비용 원고에 있다.', ''];

  for (const 대사 of 구조체.대사 ?? []) {
    줄.push(`**${대사.화자}** ${대사.동작 ? `*(${대사.동작})* ` : ''}${대사.말}`, '');
  }

  for (const 단락 of 구조체.단락 ?? []) {
    줄.push(`### ${단락.소제목}`, '');
    for (const 요점 of 단락.요점 ?? []) 줄.push(요점, '');
    if (단락.예화) 줄.push(단락.예화, '');
    if (단락.적용) 줄.push(단락.적용, '');
  }

  for (const 성구 of 구조체.성구 ?? []) {
    if (성구.본문) 줄.push(`**${성구.주소}** “${성구.본문}”`, '');
  }

  return `${줄.join('\n').trim()}\n`;
}

function 큐카드쓰기(구조체, 보고) {
  const 줄 = [...머리(구조체, 보고), '', '## 큐카드', ''];

  for (const 구간 of 구조체.구간 ?? []) {
    줄.push(`**${분초표기(구간.시작초)}** ${구간.이름} — ${구간.목적}`);
  }

  for (const 단락 of 구조체.단락 ?? []) {
    줄.push('', `**${단락.소제목}**`);
    for (const 요점 of 단락.요점 ?? []) 줄.push(`- ${요점}`);
    if ((단락.성구주소 ?? []).length) 줄.push(`- 성구 ${단락.성구주소.join(' · ')}`);
  }

  const 주소들 = (구조체.성구 ?? []).map(x => x.주소);
  if (주소들.length) 줄.push('', `성구. ${주소들.join(' · ')}`);
  if (구조체.지정요점) 줄.push('', `요점. ${요점표기(구조체.지정요점)}`);

  return `${줄.join('\n').trim()}\n`;
}

function 점검표쓰기(구조체, 보고) {
  const 줄 = [...머리(구조체, 보고), '', '## 자기 점검표', ''];

  if (구조체.지정요점) {
    줄.push(`지정 요점은 ${요점표기(구조체.지정요점)} — ${구조체.지정요점.제목} 이다.`, '', `> ${구조체.지정요점.요점본문}`, '');
  }

  const 대목 = (구조체.대사 ?? []).filter(x => String(x.요점표시 ?? '').trim());
  if (대목.length) {
    줄.push('| 대목 | 요점이 드러나는 방식 |', '| --- | --- |');
    for (const 대사 of 대목) 줄.push(`| ${대사.구간} · ${대사.화자} | ${대사.요점표시} |`);
  } else {
    줄.push('⚠ 지정 요점을 드러내는 대목이 없습니다. 요점표시를 붙일 자리를 정하십시오.');
  }

  줄.push('', '## 시간', '', `배정 ${분초표기(구조체.배정시간)}, 예상 ${분초표기(보고.총초)}.`);
  if (보고.초과 > 0) 줄.push('', `⚠ ${분초표기(보고.초과)} 초과입니다.`);

  if ((구조체.경고 ?? []).length) 줄.push('', '## 경고', '', ...구조체.경고.map(x => `- ${x}`));

  return `${줄.join('\n').trim()}\n`;
}

export function renderTalk(구조체, 설정 = 기본설정) {
  const 보고 = 시간보고(구조체, 설정);
  return {
    준비원고: 준비원고쓰기(구조체, 보고),
    낭독대본: 낭독대본쓰기(구조체, 보고),
    큐카드: 큐카드쓰기(구조체, 보고),
    점검표: 점검표쓰기(구조체, 보고),
  };
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-render.test.mjs`
Expected: PASS 8개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-render.mjs src/talk-render.test.mjs
git commit -m "원고 구조체에서 산출물 네 개를 깎아 낸다"
```

---

### Task 8: 자유 형식 OpenAI 호출

**Files:**
- Create: `src/openai-text.mjs`
- Create: `src/openai-text.test.mjs`

**Interfaces:**
- Consumes: 없음.
- Produces: `구조화생성({ 지시, 자료, 스키마, 스키마이름, 설정 })` → `{ 결과, 생성: { mode, warning } }`. `mode`는 `'ai'` 또는 `'fallback'`. 실패하면 `결과`가 `null`이고 `warning`에 이유가 담긴다. 예외를 던지지 않는다.
- `설정`은 `{ apiKey, model, fetchImpl }`이며 `model` 기본값은 `'gpt-5.4-mini'`다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/openai-text.test.mjs`

```js
// 자유 형식 구조화 출력 OpenAI 호출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 구조화생성 } from './openai-text.mjs';

const 스키마 = {
  type: 'object',
  properties: { 제목: { type: 'string' } },
  required: ['제목'],
  additionalProperties: false,
};

function 가짜응답(본문) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(본문) }] }] }),
  });
}

test('키가 없으면 호출하지 않고 폴백을 돌려준다', async () => {
  let 불렸다 = false;
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: { apiKey: '', fetchImpl: async () => { 불렸다 = true; } },
  });

  assert.equal(불렸다, false);
  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
  assert.match(결과.생성.warning, /키/);
});

test('성공하면 파싱된 객체를 돌려준다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: { 나: 1 }, 스키마, 스키마이름: 'x',
    설정: { apiKey: 'k', fetchImpl: 가짜응답({ 제목: '값' }) },
  });

  assert.deepEqual(결과.결과, { 제목: '값' });
  assert.equal(결과.생성.mode, 'ai');
});

test('요청 본문에 지시와 자료와 스키마가 들어간다', async () => {
  let 본문 = null;
  await 구조화생성({
    지시: ['첫 지시', '둘째 지시'], 자료: { 나: 1 }, 스키마, 스키마이름: '연설뼈대',
    설정: {
      apiKey: 'k',
      fetchImpl: async (url, options) => {
        본문 = JSON.parse(options.body);
        return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{"제목":"값"}' }] }] }) };
      },
    },
  });

  const 통째 = JSON.stringify(본문);
  assert.match(통째, /첫 지시/);
  assert.match(통째, /둘째 지시/);
  assert.equal(본문.text.format.name, '연설뼈대');
  assert.equal(본문.text.format.strict, true);
  assert.deepEqual(본문.text.format.schema, 스키마);
});

test('HTTP 오류를 폴백으로 바꾸고 던지지 않는다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: '한도 초과' } }) }),
    },
  });

  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
  assert.match(결과.생성.warning, /429/);
});

test('망가진 JSON을 폴백으로 바꾼다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{망가진' }] }] }) }),
    },
  });

  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
});

test('네트워크 예외를 폴백으로 바꾼다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: { apiKey: 'k', fetchImpl: async () => { throw new Error('ETIMEDOUT'); } },
  });

  assert.equal(결과.결과, null);
  assert.match(결과.생성.warning, /ETIMEDOUT/);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/openai-text.test.mjs`
Expected: FAIL. `Cannot find module './openai-text.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

`src/ai-answer.mjs`의 호출 모양을 따르되 답변 배열 전용 논리는 넣지 않는다.

`src/openai-text.mjs`

```js
// 자유 형식 구조화 출력을 받는 최소 OpenAI Responses API 호출 모듈
export const 기본모델 = 'gpt-5.4-mini';

function 출력텍스트(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

function 폴백(warning) {
  return { 결과: null, 생성: { mode: 'fallback', warning } };
}

export async function 구조화생성({ 지시, 자료, 스키마, 스키마이름, 설정 = {} }) {
  const { apiKey, model = 기본모델, fetchImpl = fetch } = 설정;
  if (!apiKey) return 폴백('OpenAI 키가 없어 규칙으로 만들었습니다.');

  const body = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 지시.join('\n') }] },
      { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(자료) }] },
    ],
    text: { format: { type: 'json_schema', name: 스키마이름, strict: true, schema: 스키마 } },
  };

  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = String(payload.error?.message ?? '').slice(0, 200);
      return 폴백(`OpenAI API ${response.status}${detail ? ` (${detail})` : ''}`);
    }
    return { 결과: JSON.parse(출력텍스트(payload)), 생성: { mode: 'ai', warning: '' } };
  } catch (e) {
    return 폴백(`OpenAI 호출 실패 — ${e.message}`);
  }
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/openai-text.test.mjs`
Expected: PASS 6개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/openai-text.mjs src/openai-text.test.mjs
git commit -m "자유 형식 구조화 출력 OpenAI 호출을 만든다"
```

---

### Task 9: 뼈대 만들기

**Files:**
- Create: `src/talk-outline.mjs`
- Create: `src/talk-outline.test.mjs`

**Interfaces:**
- Consumes: `구조화생성` (과제 8), `찾기` (과제 1), `자격판정` (과제 4).
- Produces:
  - `소제목확정인가(종류)` → boolean. `'보물연설'`과 `'공개강연'`만 true다.
  - `공개강연입력검증(입력)` → `{ 통과: boolean, 위반: [string] }`. 제목이 비었거나 실제 문장이 있는 소제목이 둘 미만이면 통과하지 않는다.
  - `구간나누기(소제목수, 배정시간)` → `[{ 이름, 시작초, 끝초, 목적 }]`. 서론 10%, 본론 65%를 소제목 수로 나눔, 결론 25%다.
  - `뼈대만들기({ 배정, 프로필, 매니페스트, 공개강연입력, 설정 })` → `{ 뼈대, 생성: { mode, warning } }`. `뼈대`는 원고 구조체이며 `대사`와 `단락.요점`이 비어 있을 수 있다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-outline.test.mjs`

```js
// 뼈대 생성과 구간 나누기를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 소제목확정인가, 구간나누기, 뼈대만들기, 공개강연입력검증 } from './talk-outline.mjs';

const 매니페스트 = {
  읽가: { 제목: '읽고 가르치는 기술을 발전시키십시오', 조회일: '2026-08-25', 과: [
    { 번호: 1, 제목: '효과적인 서론', 요점: '서론에서 흥미를 불러일으켜야 합니다.', 원칙: '', docid: 1102018441 },
  ] },
  랑제: { 제목: '사람들을 사랑하고 제자로 삼으십시오', 조회일: '2026-08-25', 과: [
    { 번호: 3, 제목: '친절', 요점: '', 원칙: '“사랑은 ··· 친절합니다.”', docid: 1102023303 },
  ] },
};

const 프로필 = { 성별: '형제', 연령: 35, 임명: '장로', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };

const 보물배정 = {
  번호: 1, 제목: '여호와께서는 자신의 종들을 징계하십니다', 절: '보물', 종류: '보물연설', 시간초: 600,
  봉사형태: '', 설명: '', 지정요점: null, 묵상: '어떤 반응을 보여야 합니까?', 낭독범위: '', 교재원문: '',
  소제목: [
    { 문장: '회개하는 유대인들은 여호와를 찾을 것이었습니다', 성구: ['렘 29:12, 13'], 출판물: [{ 표시: '「예레」 114면 3항', pc: '/pc/1' }] },
    { 문장: '여호와께서는 백성이 고토로 돌아오게 하실 것이었습니다', 성구: ['렘 29:14'], 출판물: [] },
  ],
};

const 시연배정 = {
  번호: 4, 제목: '대화 시작하기', 절: '야외봉사', 종류: '시연', 시간초: 240,
  봉사형태: '호별 방문', 설명: '호별 방문. 대화를 시작한다.', 지정요점: { 책: '랑제', 과: 3, 요점: 4 },
  소제목: [], 묵상: '', 낭독범위: '', 교재원문: '',
};

const 던지는가짜 = { apiKey: 'k', fetchImpl: async () => { throw new Error('부르면 안 된다'); } };

test('소제목이 확정된 종류를 가려낸다', () => {
  assert.equal(소제목확정인가('보물연설'), true);
  assert.equal(소제목확정인가('공개강연'), true);
  assert.equal(소제목확정인가('학생연설'), false);
  assert.equal(소제목확정인가('시연'), false);
});

test('구간을 서론 본론 결론 비율로 나눈다', () => {
  const 구간 = 구간나누기(2, 600);

  assert.equal(구간.length, 4);
  assert.equal(구간[0].시작초, 0);
  assert.equal(구간[0].끝초, 60);
  assert.equal(구간.at(-1).끝초, 600);
  for (let i = 1; i < 구간.length; i++) assert.equal(구간[i].시작초, 구간[i - 1].끝초);
});

test('보물 연설은 AI를 부르지 않고 교재 소제목을 그대로 옮긴다', async () => {
  const { 뼈대, 생성 } = await 뼈대만들기({ 배정: 보물배정, 프로필, 매니페스트, 설정: 던지는가짜 });

  assert.equal(생성.mode, 'deterministic');
  assert.equal(뼈대.단락.length, 2);
  assert.equal(뼈대.단락[0].소제목, '회개하는 유대인들은 여호와를 찾을 것이었습니다');
  assert.equal(뼈대.단락[0].출처, '교재');
  assert.deepEqual(뼈대.단락[0].성구주소, ['렘 29:12, 13']);
  assert.equal(뼈대.배정시간, 600);
});

test('보물 연설의 출판물 참조가 출처에 남는다', async () => {
  const { 뼈대 } = await 뼈대만들기({ 배정: 보물배정, 프로필, 매니페스트, 설정: 던지는가짜 });

  assert.ok(뼈대.출처.some(x => x.제목.includes('「예레」 114면 3항')));
});

test('공개강연은 입력한 소제목을 그대로 옮기고 AI를 부르지 않는다', async () => {
  const 입력 = {
    제목: '하느님의 왕국은 무엇입니까?', 주제성구: '마태 6:10', 배정시간: 1800,
    소제목: [{ 문장: '왕국은 실제 정부입니다', 성구: ['다니엘 2:44'] }, { 문장: '왕국은 무엇을 이룹니까', 성구: [] }],
  };
  const { 뼈대, 생성 } = await 뼈대만들기({
    배정: { 종류: '공개강연' }, 프로필, 매니페스트, 공개강연입력: 입력, 설정: 던지는가짜,
  });

  assert.equal(생성.mode, 'deterministic');
  assert.equal(뼈대.제목, '하느님의 왕국은 무엇입니까?');
  assert.equal(뼈대.배정시간, 1800);
  assert.equal(뼈대.단락[0].출처, '개요');
  assert.equal(뼈대.주제성구.주소, '마태 6:10');
});

test('지정 요점을 매니페스트에서 찾아 뼈대에 붙인다', async () => {
  const { 뼈대 } = await 뼈대만들기({
    배정: 시연배정, 프로필, 매니페스트,
    설정: { apiKey: '', fetchImpl: async () => { throw new Error('불리면 안 된다'); } },
  });

  assert.equal(뼈대.지정요점.책, '랑제');
  assert.equal(뼈대.지정요점.과, 3);
  assert.equal(뼈대.지정요점.요점, 4);
  assert.equal(뼈대.지정요점.제목, '친절');
  assert.match(뼈대.지정요점.요점본문, /친절합니다/);
});

test('시연은 키가 없으면 결정론적 뼈대를 돌려주고 비어 있지 않다', async () => {
  const { 뼈대, 생성 } = await 뼈대만들기({
    배정: 시연배정, 프로필, 매니페스트, 설정: { apiKey: '', fetchImpl: async () => { throw new Error('x'); } },
  });

  assert.equal(생성.mode, 'fallback');
  assert.ok(뼈대.구간.length > 0);
  assert.equal(뼈대.종류, '시연');
});

test('시연은 키가 있으면 AI 응답의 구간을 쓴다', async () => {
  const 응답 = {
    구간: [{ 이름: '여는 인사', 시작초: 0, 끝초: 25, 목적: '이름을 밝힌다' }],
    설정: { 등장인물: [{ 역할: '전도인', 설명: '배정된 형제' }], 상황: '현관', 준비물: ['팜플렛'] },
    성구주소: ['예레미야 29:11'],
    요점배치: '여는 인사',
  };
  const { 뼈대, 생성 } = await 뼈대만들기({
    배정: 시연배정, 프로필, 매니페스트,
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(응답) }] }] }) }),
    },
  });

  assert.equal(생성.mode, 'ai');
  assert.equal(뼈대.구간[0].이름, '여는 인사');
  assert.equal(뼈대.설정.상황, '현관');
});

test('공개강연 입력을 검증한다', () => {
  assert.equal(공개강연입력검증({ 제목: '가', 소제목: [{ 문장: '나' }, { 문장: '다' }] }).통과, true);
  assert.equal(공개강연입력검증({ 제목: '', 소제목: [{ 문장: '나' }, { 문장: '다' }] }).통과, false);
  assert.equal(공개강연입력검증({ 제목: '가', 소제목: [{ 문장: '나' }] }).통과, false);
  assert.equal(공개강연입력검증({ 제목: '가', 소제목: [{ 문장: '나' }, { 문장: '  ' }] }).통과, false);
  assert.match(공개강연입력검증({ 제목: '', 소제목: [] }).위반.join(' '), /제목/);
});

test('입력한 공개강연 소제목이 글자 그대로 남는다', async () => {
  const 입력 = { 제목: '제목', 주제성구: '', 배정시간: 1800, 소제목: [{ 문장: '고치면 안 되는 소제목입니다', 성구: [] }, { 문장: '둘째 소제목입니다', 성구: [] }] };
  const { 뼈대 } = await 뼈대만들기({ 배정: { 종류: '공개강연' }, 프로필, 매니페스트, 공개강연입력: 입력, 설정: 던지는가짜 });

  assert.equal(뼈대.단락[0].소제목, '고치면 안 되는 소제목입니다');
  assert.equal(뼈대.단락[1].소제목, '둘째 소제목입니다');
});

test('프롬프트에 매니페스트 전권 본문을 넣지 않는다', async () => {
  let 본문 = '';
  await 뼈대만들기({
    배정: 시연배정, 프로필, 매니페스트,
    설정: {
      apiKey: 'k',
      fetchImpl: async (url, options) => {
        본문 = options.body;
        return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{"구간":[]}' }] }] }) };
      },
    },
  });

  // 「읽가」 요점 목록은 들어가되, 과 본문 전체가 들어가는 경로는 없어야 한다.
  assert.ok(본문.length < 20000, `프롬프트가 너무 크다 — ${본문.length}자`);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-outline.test.mjs`
Expected: FAIL. `Cannot find module './talk-outline.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

`src/talk-outline.mjs`

```js
// 연설 종류에 따라 뼈대를 만드는 모듈. 소제목이 확정된 종류는 AI를 부르지 않는다
import { 구조화생성 } from './openai-text.mjs';
import { 찾기 } from './teaching-lessons.mjs';

const 확정종류 = new Set(['보물연설', '공개강연']);

export function 소제목확정인가(종류) {
  return 확정종류.has(종류);
}

export function 공개강연입력검증(입력) {
  const 위반 = [];
  if (!String(입력?.제목 ?? '').trim()) 위반.push('제목이 비어 있습니다.');
  const 소제목 = (입력?.소제목 ?? []).filter(x => String(x?.문장 ?? '').trim());
  if (소제목.length < 2) 위반.push('소제목이 둘 이상 필요합니다.');
  if ((입력?.소제목 ?? []).length !== 소제목.length) 위반.push('빈 소제목 칸이 있습니다.');
  return { 통과: 위반.length === 0, 위반 };
}

export function 구간나누기(소제목수, 배정시간) {
  const 서론 = Math.round(배정시간 * 0.1);
  const 결론 = Math.round(배정시간 * 0.25);
  const 본론 = 배정시간 - 서론 - 결론;
  const 몫 = Math.max(1, 소제목수);
  const 구간 = [{ 이름: '서론', 시작초: 0, 끝초: 서론, 목적: '흥미를 일으키고 다룰 내용을 밝힌다' }];

  let 커서 = 서론;
  for (let i = 0; i < 몫; i++) {
    const 끝 = i === 몫 - 1 ? 서론 + 본론 : 커서 + Math.round(본론 / 몫);
    구간.push({ 이름: `본론 ${i + 1}`, 시작초: 커서, 끝초: 끝, 목적: '소제목 하나를 다룬다' });
    커서 = 끝;
  }

  구간.push({ 이름: '결론', 시작초: 커서, 끝초: 배정시간, 목적: '요점을 되짚고 적용을 남긴다' });
  return 구간;
}

function 빈구조체(덮어쓰기) {
  return {
    제목: '', 종류: '', 배정시간: 0, 지정요점: null, 주제성구: null, 설정: null,
    구간: [], 대사: [], 단락: [], 성구: [], 축약순서: [], 출처: [], 경고: [],
    ...덮어쓰기,
  };
}

function 지정요점붙이기(배정, 매니페스트) {
  if (!배정.지정요점) return null;
  const 과 = 찾기(매니페스트, 배정.지정요점.책, 배정.지정요점.과);
  if (!과) return { ...배정.지정요점, 제목: '', 요점본문: '' };
  return { ...배정.지정요점, 제목: 과.제목, 요점본문: 과.요점 || 과.원칙 || '' };
}

function 요점목록(매니페스트) {
  return (매니페스트?.읽가?.과 ?? []).map(x => `${x.번호} ${x.제목} — ${x.요점}`);
}

function 보물뼈대(배정, 매니페스트) {
  const 출처 = [];
  const 단락 = 배정.소제목.map(소제목 => {
    for (const 출판물 of 소제목.출판물 ?? []) {
      출처.push({ 제목: 출판물.표시, url: `https://wol.jw.org${출판물.pc}`, 조회일: new Date().toISOString().slice(0, 10) });
    }
    return { 소제목: 소제목.문장, 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [...(소제목.성구 ?? [])] };
  });

  if (배정.묵상) 단락.push({ 소제목: '묵상해 볼 점', 출처: '교재', 요점: [배정.묵상], 예화: '', 적용: '', 성구주소: [] });

  return 빈구조체({
    제목: 배정.제목, 종류: '보물연설', 배정시간: 배정.시간초,
    지정요점: 지정요점붙이기(배정, 매니페스트),
    구간: 구간나누기(단락.length, 배정.시간초), 단락, 출처,
  });
}

function 공개강연뼈대(입력, 매니페스트) {
  const 단락 = (입력.소제목 ?? []).map(소제목 => ({
    소제목: 소제목.문장, 출처: '개요', 요점: [], 예화: '', 적용: '', 성구주소: [...(소제목.성구 ?? [])],
  }));

  return 빈구조체({
    제목: 입력.제목, 종류: '공개강연', 배정시간: 입력.배정시간 ?? 1800,
    주제성구: 입력.주제성구 ? { 주소: 입력.주제성구, 본문: '' } : null,
    구간: 구간나누기(단락.length, 입력.배정시간 ?? 1800), 단락,
  });
}

function 결정론적뼈대(배정, 매니페스트) {
  return 빈구조체({
    제목: 배정.제목, 종류: 배정.종류, 배정시간: 배정.시간초,
    지정요점: 지정요점붙이기(배정, 매니페스트),
    구간: 구간나누기(3, 배정.시간초),
    경고: ['자동 생성 — 구성만 규칙으로 잡았습니다.'],
  });
}

export async function 뼈대만들기({ 배정, 프로필, 매니페스트, 공개강연입력 = null, 설정 = {} }) {
  if (배정.종류 === '공개강연') {
    return { 뼈대: 공개강연뼈대(공개강연입력 ?? {}, 매니페스트), 생성: { mode: 'deterministic', warning: '' } };
  }
  if (배정.종류 === '보물연설') {
    return { 뼈대: 보물뼈대(배정, 매니페스트), 생성: { mode: 'deterministic', warning: '' } };
  }

  const 지시 = [
    '여호와의 증인의 이해를 따르는 한국어 연설 준비 보조자입니다.',
    '지금은 원고의 구성만 잡습니다. 대사와 문장은 아직 쓰지 마십시오.',
    '성구는 주소만 쓰십시오. 성구 문장을 절대 쓰지 마십시오.',
    '지정 요점이 어느 구간에서 드러날지 반드시 정하십시오.',
    '구간의 시작초와 끝초를 배정 시간 안에서 빈틈없이 이어 붙이십시오.',
    '한국어 문장은 마침표로 끝내고 문장 끝에 콜론을 쓰지 마십시오.',
    '한글, 라틴 문자, 숫자, 일반 문장 부호만 쓰고 다른 문자 체계를 섞지 마십시오.',
  ];

  const 자료 = {
    배정: { 제목: 배정.제목, 종류: 배정.종류, 시간초: 배정.시간초, 봉사형태: 배정.봉사형태, 설명: 배정.설명, 낭독범위: 배정.낭독범위, 교재원문: 배정.교재원문 },
    지정요점: 지정요점붙이기(배정, 매니페스트),
    화자: { 성별: 프로필.성별, 연령: 프로필.연령, 임명: 프로필.임명, 파이오니아: 프로필.파이오니아, 스타일: 프로필.스타일 },
    문체견본: String(프로필.문체견본 ?? '').slice(0, 2000),
    읽가요점목록: 요점목록(매니페스트),
  };

  const 스키마 = {
    type: 'object',
    properties: {
      구간: { type: 'array', items: { type: 'object', properties: {
        이름: { type: 'string' }, 시작초: { type: 'number' }, 끝초: { type: 'number' }, 목적: { type: 'string' },
      }, required: ['이름', '시작초', '끝초', '목적'], additionalProperties: false } },
      설정: { type: 'object', properties: {
        등장인물: { type: 'array', items: { type: 'object', properties: { 역할: { type: 'string' }, 설명: { type: 'string' } }, required: ['역할', '설명'], additionalProperties: false } },
        상황: { type: 'string' }, 준비물: { type: 'array', items: { type: 'string' } },
      }, required: ['등장인물', '상황', '준비물'], additionalProperties: false },
      성구주소: { type: 'array', items: { type: 'string' } },
      요점배치: { type: 'string' },
    },
    required: ['구간', '설정', '성구주소', '요점배치'],
    additionalProperties: false,
  };

  const { 결과, 생성 } = await 구조화생성({ 지시, 자료, 스키마, 스키마이름: '연설뼈대', 설정 });
  if (!결과 || !(결과.구간 ?? []).length) {
    const 뼈대 = 결정론적뼈대(배정, 매니페스트);
    return { 뼈대, 생성: { mode: 'fallback', warning: 생성.warning || '구간을 받지 못했습니다.' } };
  }

  return {
    뼈대: 빈구조체({
      제목: 배정.제목, 종류: 배정.종류, 배정시간: 배정.시간초,
      지정요점: 지정요점붙이기(배정, 매니페스트),
      구간: 결과.구간,
      설정: 배정.종류 === '시연' ? (결과.설정 ?? null) : null,
      성구: (결과.성구주소 ?? []).map(주소 => ({ 주소, 본문: '' })),
      경고: 결과.요점배치 ? [] : ['요점 배치를 받지 못했습니다.'],
    }),
    생성,
  };
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-outline.test.mjs`
Expected: PASS 9개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-outline.mjs src/talk-outline.test.mjs
git commit -m "연설 종류에 따라 뼈대를 만든다"
```

---

### Task 10: 살 채우기

**Files:**
- Create: `src/talk-draft.mjs`
- Create: `src/talk-draft.test.mjs`

**Interfaces:**
- Consumes: `구조화생성` (과제 8), `성구채우기`·`모델성구검사` (과제 6).
- Produces: `살채우기({ 뼈대, 프로필, 매니페스트, 읽기, 설정 })` → `{ 구조체, 생성: { mode, warning } }`. `읽기`는 과제 6의 성구 읽기 함수다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-draft.test.mjs`

```js
// 뼈대에 살을 채우고 모델 성구 위반을 막는 것을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 살채우기 } from './talk-draft.mjs';

const 읽기 = 주소 => (주소 === '예레미야 29:11' ? '미래와 희망을 갖게 하려는 것이다.' : null);
const 매니페스트 = { 읽가: { 과: [] }, 랑제: { 과: [] } };
const 프로필 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };

const 시연뼈대 = {
  제목: '대화 시작하기', 종류: '시연', 배정시간: 240,
  지정요점: { 책: '랑제', 과: 3, 요점: 4, 제목: '친절', 요점본문: '친절하게 말하십시오.' },
  주제성구: null, 설정: { 등장인물: [{ 역할: '전도인', 설명: '형제' }], 상황: '현관', 준비물: [] },
  구간: [{ 이름: '여는 인사', 시작초: 0, 끝초: 25, 목적: '이름을 밝힌다' }],
  대사: [], 단락: [], 성구: [], 축약순서: [], 출처: [], 경고: [],
};

function 응답하는(본문, 기록 = {}) {
  return {
    apiKey: 'k',
    fetchImpl: async (url, options) => {
      기록.본문 = options.body;
      기록.횟수 = (기록.횟수 ?? 0) + 1;
      const 내용 = Array.isArray(본문) ? 본문[기록.횟수 - 1] : 본문;
      return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(내용) }] }] }) };
    },
  };
}

test('대사를 채우고 자리표시자를 로컬 본문으로 바꾼다', async () => {
  const { 구조체, 생성 } = await 살채우기({
    뼈대: 시연뼈대, 프로필, 매니페스트, 읽기,
    설정: 응답하는({
      대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '읽어 드리겠습니다. {{성구:예레미야 29:11}}', 동작: '', 요점표시: '어조를 낮춘다' }],
      단락: [], 축약순서: [{ 순위: 1, 대상: '여는 인사', 사유: '없어도 된다' }],
    }),
  });

  assert.equal(생성.mode, 'ai');
  assert.match(구조체.대사[0].말, /“미래와 희망을 갖게 하려는 것이다\.”/);
  assert.equal(구조체.성구[0].주소, '예레미야 29:11');
});

test('모델이 성구 문장을 직접 쓰면 한 번 다시 요청한다', async () => {
  const 기록 = {};
  const { 구조체, 생성 } = await 살채우기({
    뼈대: 시연뼈대, 프로필, 매니페스트, 읽기,
    설정: 응답하는([
      { 대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '“내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다. 그것은 평화를 주려는 생각이다.”', 동작: '', 요점표시: '' }], 단락: [], 축약순서: [] },
      { 대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '{{성구:예레미야 29:11}}', 동작: '', 요점표시: '' }], 단락: [], 축약순서: [] },
    ], 기록),
  });

  assert.equal(기록.횟수, 2);
  assert.equal(생성.mode, 'ai');
  assert.ok(!구조체.경고.some(x => /성구 문장을 직접/.test(x)));
});

test('다시 요청해도 위반이면 그 대사를 비우고 경고를 남긴다', async () => {
  const 나쁜대사 = { 대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '“내가 너희에 대해 갖고 있는 생각을 나는 잘 알고 있다. 그것은 평화를 주려는 생각이다.”', 동작: '', 요점표시: '' }], 단락: [], 축약순서: [] };
  const { 구조체 } = await 살채우기({
    뼈대: 시연뼈대, 프로필, 매니페스트, 읽기, 설정: 응답하는([나쁜대사, 나쁜대사]),
  });

  assert.ok(구조체.경고.some(x => /성구 문장을 직접/.test(x)));
  assert.equal(구조체.대사.length, 0);
});

test('교재에서 온 소제목 문장을 모델이 바꿔도 원본을 지킨다', async () => {
  const 보물뼈대 = {
    ...시연뼈대, 종류: '보물연설', 설정: null, 배정시간: 600,
    단락: [{ 소제목: '원래 소제목입니다', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [] }],
  };
  const { 구조체 } = await 살채우기({
    뼈대: 보물뼈대, 프로필, 매니페스트, 읽기,
    설정: 응답하는({
      대사: [],
      단락: [{ 소제목: '모델이 고친 소제목입니다', 요점: ['요점 하나'], 예화: '예화', 적용: '적용', 성구주소: [] }],
      축약순서: [],
    }),
  });

  assert.equal(구조체.단락[0].소제목, '원래 소제목입니다');
  assert.deepEqual(구조체.단락[0].요점, ['요점 하나']);
  assert.equal(구조체.단락[0].출처, '교재');
});

test('키가 없으면 뼈대를 그대로 돌려주고 경고를 남긴다', async () => {
  const { 구조체, 생성 } = await 살채우기({
    뼈대: 시연뼈대, 프로필, 매니페스트, 읽기,
    설정: { apiKey: '', fetchImpl: async () => { throw new Error('부르면 안 된다'); } },
  });

  assert.equal(생성.mode, 'fallback');
  assert.equal(구조체.구간.length, 1);
  assert.ok(구조체.경고.length > 0);
});

test('해석 못 한 성구 주소가 경고로 남는다', async () => {
  const { 구조체 } = await 살채우기({
    뼈대: 시연뼈대, 프로필, 매니페스트, 읽기,
    설정: 응답하는({
      대사: [{ 구간: '여는 인사', 화자: '전도인', 말: '{{성구:없는책 1:1}}', 동작: '', 요점표시: '' }],
      단락: [], 축약순서: [],
    }),
  });

  assert.ok(구조체.경고.some(x => /성구 자동 확인 실패/.test(x)));
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-draft.test.mjs`
Expected: FAIL. `Cannot find module './talk-draft.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

`src/talk-draft.mjs`

```js
// 확정된 뼈대에 대사와 요점을 채우고 성구를 로컬 본문으로만 검증하는 모듈
import { 구조화생성 } from './openai-text.mjs';
import { 성구채우기, 모델성구검사 } from './talk-verses.mjs';

const 스키마 = {
  type: 'object',
  properties: {
    대사: { type: 'array', items: { type: 'object', properties: {
      구간: { type: 'string' }, 화자: { type: 'string' }, 말: { type: 'string' }, 동작: { type: 'string' }, 요점표시: { type: 'string' },
    }, required: ['구간', '화자', '말', '동작', '요점표시'], additionalProperties: false } },
    단락: { type: 'array', items: { type: 'object', properties: {
      소제목: { type: 'string' }, 요점: { type: 'array', items: { type: 'string' } },
      예화: { type: 'string' }, 적용: { type: 'string' }, 성구주소: { type: 'array', items: { type: 'string' } },
    }, required: ['소제목', '요점', '예화', '적용', '성구주소'], additionalProperties: false } },
    축약순서: { type: 'array', items: { type: 'object', properties: {
      순위: { type: 'number' }, 대상: { type: 'string' }, 사유: { type: 'string' },
    }, required: ['순위', '대상', '사유'], additionalProperties: false } },
  },
  required: ['대사', '단락', '축약순서'],
  additionalProperties: false,
};

function 지시만들기(뼈대, 되풀이) {
  const 줄 = [
    '여호와의 증인의 이해를 따르는 한국어 연설 원고 작성자입니다.',
    '주어진 구간과 소제목을 그대로 따르십시오. 구간을 더하거나 지우지 마십시오.',
    '**성구 문장을 절대 쓰지 마십시오.** 성구를 낭독하는 자리에는 {{성구:권 장:절}} 형태의 자리표시자만 쓰십시오.',
    '소제목 문장을 고치지 마십시오. 받은 그대로 돌려주고 요점과 예화와 적용만 채우십시오.',
    '지정 요점이 드러나는 대사에는 요점표시를 채우십시오. 다른 대사의 요점표시는 빈 문자열로 두십시오.',
    '축약순서에는 시간을 넘길 때 먼저 뺄 곳을 순위대로 담으십시오. 대상은 구간 이름으로 쓰십시오.',
    '출판물 근거를 대지 못한 교리적 결론에는 "출판물 근거 미확인 — 내 정리임."을 붙이십시오.',
    '한국어 문장은 마침표로 끝내고 문장 끝에 콜론을 쓰지 마십시오.',
    '한글, 라틴 문자, 숫자, 일반 문장 부호만 쓰고 다른 문자 체계를 섞지 마십시오.',
  ];
  if (되풀이) 줄.push('앞선 응답이 인용부호 안에 성경 문장을 직접 썼습니다. 이번에는 반드시 자리표시자만 쓰십시오.');
  return 줄;
}

function 소제목지키기(뼈대, 받은단락) {
  if (!(뼈대.단락 ?? []).length) {
    return (받은단락 ?? []).map(단락 => ({ ...단락, 출처: '생성' }));
  }
  return 뼈대.단락.map((원본, i) => {
    const 받은 = (받은단락 ?? [])[i] ?? {};
    return {
      소제목: 원본.소제목,
      출처: 원본.출처,
      요점: 받은.요점 ?? [],
      예화: 받은.예화 ?? '',
      적용: 받은.적용 ?? '',
      성구주소: [...new Set([...(원본.성구주소 ?? []), ...(받은.성구주소 ?? [])])],
    };
  });
}

export async function 살채우기({ 뼈대, 프로필, 매니페스트, 읽기, 설정 = {} }) {
  const 자료 = {
    제목: 뼈대.제목, 종류: 뼈대.종류, 배정시간: 뼈대.배정시간,
    구간: 뼈대.구간, 설정: 뼈대.설정, 지정요점: 뼈대.지정요점,
    소제목: (뼈대.단락 ?? []).map(x => ({ 소제목: x.소제목, 출처: x.출처, 성구주소: x.성구주소 })),
    화자: { 성별: 프로필.성별, 연령: 프로필.연령, 임명: 프로필.임명, 파이오니아: 프로필.파이오니아, 스타일: 프로필.스타일 },
    문체견본: String(프로필.문체견본 ?? '').slice(0, 2000),
  };

  let 마지막경고 = '';
  for (const 되풀이 of [false, true]) {
    const { 결과, 생성 } = await 구조화생성({
      지시: 지시만들기(뼈대, 되풀이), 자료, 스키마, 스키마이름: '연설원고', 설정,
    });
    마지막경고 = 생성.warning;
    if (!결과) break;

    const 후보 = {
      ...뼈대,
      대사: 결과.대사 ?? [],
      단락: 소제목지키기(뼈대, 결과.단락),
      축약순서: 결과.축약순서 ?? [],
    };
    const 검사 = 모델성구검사(후보);
    if (검사.통과) return { 구조체: 성구채우기(후보, 읽기), 생성 };
    if (되풀이) {
      const 막은것 = { ...후보, 대사: [], 경고: [...(뼈대.경고 ?? []), ...검사.위반] };
      return { 구조체: 성구채우기(막은것, 읽기), 생성 };
    }
  }

  const 그대로 = { ...뼈대, 경고: [...(뼈대.경고 ?? []), 마지막경고 || '원고를 생성하지 못했습니다.'] };
  return { 구조체: 성구채우기(그대로, 읽기), 생성: { mode: 'fallback', warning: 마지막경고 } };
}
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-draft.test.mjs`
Expected: PASS 6개.

- [ ] **Step 5: 커밋한다**

```bash
git add src/talk-draft.mjs src/talk-draft.test.mjs
git commit -m "뼈대에 살을 채우고 모델 성구를 막는다"
```

---

### Task 11: 조립 계층과 서버 라우트

**Files:**
- Create: `src/talk-service.mjs`
- Create: `src/talk-service.test.mjs`
- Modify: `src/web-server.mjs`

**Interfaces:**
- Consumes: 과제 1·3·4·9·10의 모든 내보내기. `fetchCached` (`src/wol-fetch.mjs`), `findWeekStart` 계열 (`src/wol-week.mjs`).
- Produces:
  - `배정목록({ 날짜, 프로필, 루트, 조회 })` → `{ 주라벨, 배정: [...], 공개강연카드 }`. `조회`는 `(url, cacheName) => html` 이며 테스트에서 가짜를 넣는다.
  - `뼈대준비(입력, 환경)` → `{ 뼈대, 생성 }`.
  - `원고준비(입력, 환경)` → `{ 구조체, 산출물, 시간, 생성 }`.

`환경`은 `{ 루트, 매니페스트, 읽기, 설정 }`이다. `web-server.mjs`와 `api/*.js`가 같은 환경을 만든다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/talk-service.test.mjs`

```js
// 세 API가 부르는 조립 계층을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 배정목록, 원고준비 } from './talk-service.mjs';

const 교재 = readFileSync('tests/fixtures/교재-배정.html', 'utf8');
const 가짜조회 = async () => 교재;
// weekDocuments 는 네트워크를 타므로 테스트에서 가짜를 넣는다.
const 가짜주 = async () => ({ 교재docId: 202026248, 주라벨: '2026년 8월 24-30일' });
const 매니페스트 = { 읽가: { 제목: '가', 조회일: '2026-08-25', 과: [{ 번호: 1, 제목: '효과적인 서론', 요점: '흥미를 일으킵니다.', 원칙: '', docid: 1102018441 }] }, 랑제: { 제목: '나', 조회일: '2026-08-25', 과: [] } };
const 읽기 = () => null;
const 형제 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };

test('연설이 아닌 항목은 목록에서 뺀다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.ok(!배정.some(x => x.종류 === '연설아님'));
  assert.ok(배정.some(x => x.번호 === 1));
});

test('자격 게이트가 목록에 씌워진다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });
  const 보물 = 배정.find(x => x.번호 === 1);
  const 시연 = 배정.find(x => x.번호 === 4);

  assert.equal(보물.가능, false);
  assert.equal(시연.가능, true);
  assert.match(보물.사유, /장로/);
});

test('공개강연 카드가 언제나 함께 온다', async () => {
  const { 공개강연카드 } = await 배정목록({ 날짜: '2026-08-24', 프로필: { ...형제, 임명: '장로' }, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.equal(공개강연카드.종류, '공개강연');
  assert.equal(공개강연카드.가능, true);
  assert.equal(공개강연카드.시간초, 1800);
});

test('교재 조회가 실패하면 예외를 던진다', async () => {
  await assert.rejects(
    () => 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 주찾기: 가짜주, 조회: async () => { throw new Error('ETIMEDOUT'); } }),
    /ETIMEDOUT/,
  );
});

test('원고 준비가 산출물 네 개와 시간을 함께 돌려준다', async () => {
  const 뼈대 = {
    제목: '가', 종류: '보물연설', 배정시간: 600, 지정요점: null, 주제성구: null, 설정: null,
    구간: [{ 이름: '서론', 시작초: 0, 끝초: 60, 목적: '연다' }],
    대사: [], 단락: [{ 소제목: '소제목', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [] }],
    성구: [], 축약순서: [], 출처: [], 경고: [],
  };
  const { 산출물, 시간 } = await 원고준비(
    { 뼈대, 프로필: 형제 },
    { 매니페스트, 읽기, 설정: { apiKey: '', fetchImpl: async () => { throw new Error('x'); } } },
  );

  assert.deepEqual(Object.keys(산출물).sort(), ['낭독대본', '점검표', '준비원고', '큐카드']);
  assert.equal(시간.배정초, 600);
  assert.equal(typeof 시간.총초, 'number');
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test -- src/talk-service.test.mjs`
Expected: FAIL. `Cannot find module './talk-service.mjs'`.

- [ ] **Step 3: 최소 구현을 쓴다**

주 문서 URL을 만드는 방법은 `src/prep-service.mjs`가 이미 한다. 그 파일을 읽고 같은 방식으로 그 주 「생활과 봉사」 docid를 얻는다.

`src/talk-service.mjs`

```js
// 연설 세 API가 공통으로 부르는 조립 계층
import { join } from 'node:path';
import { fetchCached } from './wol-fetch.mjs';
import { parseTalkAssignments } from './talk-assignments.mjs';
import { 배정에게이트적용, 자격판정, 기본프로필 } from './talk-profile.mjs';
import { loadTeachingLessons } from './teaching-lessons.mjs';
import { 뼈대만들기 } from './talk-outline.mjs';
import { 살채우기 } from './talk-draft.mjs';
import { renderTalk } from './talk-render.mjs';
import { 시간보고, 기본설정 } from './talk-timing.mjs';
import { 성구읽기만들기 } from './talk-verses.mjs';
import { weekDocuments } from './prep-service.mjs';
import { articleUrl } from './wol-week.mjs';

export function 환경만들기(루트) {
  return {
    루트,
    매니페스트: loadTeachingLessons(join(루트, 'src', 'teaching-lessons.json')),
    읽기: 성구읽기만들기(루트),
    설정: { apiKey: process.env.OPENAI_API_KEY ?? '', model: process.env.OPENAI_MODEL || undefined },
  };
}

export async function 배정목록({ 날짜, 프로필 = 기본프로필(), 조회 = fetchCached, 주찾기 = weekDocuments }) {
  const week = await 주찾기(날짜);
  if (!week.교재docId) throw new Error('주간 집회 페이지에서 생활과 봉사 교재를 찾을 수 없다');
  const url = articleUrl(week.교재docId);
  const html = await 조회(url, `doc-${week.교재docId}.html`);
  const 전체 = parseTalkAssignments(html);
  const 연설만 = 전체.filter(x => x.종류 !== '연설아님');
  if (!연설만.length) throw new Error(`교재에서 연설 배정을 하나도 찾지 못했다 — ${url}`);

  return {
    주라벨: week.주라벨 ?? 날짜,
    url,
    배정: 배정에게이트적용(프로필, 연설만),
    공개강연카드: {
      번호: 0, 제목: '일요일 공개강연', 절: '공개강연', 종류: '공개강연', 시간초: 1800,
      봉사형태: '', 설명: '개요의 제목과 주제 성구와 소제목을 입력하십시오.',
      지정요점: null, 소제목: [], 묵상: '', 낭독범위: '', 교재원문: '',
      ...자격판정(프로필, '공개강연'),
    },
  };
}

export async function 뼈대준비({ 배정, 프로필 = 기본프로필(), 공개강연입력 = null }, 환경) {
  return 뼈대만들기({ 배정, 프로필, 매니페스트: 환경.매니페스트, 공개강연입력, 설정: 환경.설정 });
}

export async function 원고준비({ 뼈대, 프로필 = 기본프로필() }, 환경) {
  const { 구조체, 생성 } = await 살채우기({
    뼈대, 프로필, 매니페스트: 환경.매니페스트, 읽기: 환경.읽기, 설정: 환경.설정,
  });
  const 설정 = { ...기본설정, 분당글자수: 프로필.분당글자수 ?? 기본설정.분당글자수 };
  return { 구조체, 산출물: renderTalk(구조체, 설정), 시간: 시간보고(구조체, 설정), 생성 };
}
```

`weekDocuments`는 `src/prep-service.mjs`에 이미 있지만 내보내지 않는다. 선언 앞에 `export`
한 낱말만 붙인다. 함수 본문과 `prepareWatchtower`·`prepareLifeAndMinistry`의 동작은
건드리지 않는다.

```diff
-async function weekDocuments(dateText) {
+export async function weekDocuments(dateText) {
```

- [ ] **Step 4: 테스트를 돌려 통과를 확인한다**

Run: `npm test -- src/talk-service.test.mjs`
Expected: PASS 5개.

- [ ] **Step 5: 서버 라우트 세 개를 더한다**

`src/web-server.mjs`의 `handle` 안, `/api/life-ministry` 분기 바로 아래에 넣는다. `POST` 본문 읽기가 아직 없으므로 함수 하나를 더한다.

```js
import { 환경만들기, 배정목록, 뼈대준비, 원고준비 } from './talk-service.mjs';

async function 본문읽기(req) {
  const 조각 = [];
  for await (const 덩이 of req) 조각.push(덩이);
  return JSON.parse(Buffer.concat(조각).toString('utf8') || '{}');
}
```

경로는 **평평하게** 쓴다. Vercel은 `api/watchtower.js`를 `/api/watchtower`로 자동 연결하는데, `/api/talk/assignments`처럼 중첩하려면 `api/talk/assignments.js`가 되어야 하고 그러면 `vercel.json`의 `"api/*.js"` 글로브가 그 파일을 놓쳐 `core/bible/**`가 함수에 안 실린다. 성구를 못 읽게 된다. 설계 문서 3절의 경로 표기도 이 평평한 형태로 고친다.

```js
    if (url.pathname === '/api/talk-assignments') {
      json(res, 200, await 배정목록({
        날짜: url.searchParams.get('date'),
        프로필: JSON.parse(url.searchParams.get('profile') ?? 'null') ?? undefined,
      }));
      return;
    }
    if (url.pathname === '/api/talk-outline' && req.method === 'POST') {
      json(res, 200, await 뼈대준비(await 본문읽기(req), 환경만들기(root)));
      return;
    }
    if (url.pathname === '/api/talk-draft' && req.method === 'POST') {
      json(res, 200, await 원고준비(await 본문읽기(req), 환경만들기(root)));
      return;
    }
```

- [ ] **Step 6: 서버가 뜨는지 확인한다**

Run: `npm run web`
브라우저나 다른 창에서 `http://localhost:3000/api/talk-assignments?date=2026-08-24` 를 연다.
Expected: 배정 목록 JSON이 온다. 서버를 끈다.

설계 문서 3절의 경로 표기 세 줄을 평평한 형태로 고친다.

- [ ] **Step 7: 전체 테스트를 돌린다**

Run: `npm test`
Expected: 기준선 177개보다 늘었고 실패 0개다.

- [ ] **Step 8: 커밋한다**

```bash
git add src/talk-service.mjs src/talk-service.test.mjs src/web-server.mjs src/prep-service.mjs
git commit -m "연설 API 세 개를 서버에 붙인다"
```

---

### Task 12: 화면과 Vercel 어댑터

**Files:**
- Create: `api/talk-assignments.js`
- Create: `api/talk-outline.js`
- Create: `api/talk-draft.js`
- Modify: `vercel.json`
- Modify: `web/index.html`
- Modify: `web/app.js`
- Modify: `web/styles.css`

**Interfaces:**
- Consumes: `환경만들기`, `배정목록`, `뼈대준비`, `원고준비` (과제 11), `스타일목록`·`임명목록`·`기본프로필` (과제 4).
- Produces: 브라우저에서 쓰는 화면. 서버로 나가는 것은 JSON API 세 개뿐이다.

- [ ] **Step 1: 기존 어댑터를 읽고 같은 모양으로 셋을 만든다**

`api/life-ministry.js`를 먼저 읽는다. 같은 모양을 따른다. `api/talk-assignments.js`는 이렇다.

```js
// Vercel 서버리스에서 연설 배정 목록을 돌려주는 어댑터
import { 배정목록 } from '../src/talk-service.mjs';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const 프로필 = JSON.parse(url.searchParams.get('profile') ?? 'null');
    const 결과 = await 배정목록({ 날짜: url.searchParams.get('date'), 프로필: 프로필 ?? undefined });
    res.status(200).json(결과);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

`api/talk-outline.js`와 `api/talk-draft.js`는 `POST` 본문을 쓴다.

```js
// Vercel 서버리스에서 연설 뼈대를 만드는 어댑터
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { 환경만들기, 뼈대준비 } from '../src/talk-service.mjs';

const 루트 = join(fileURLToPath(new URL('..', import.meta.url)));

export default async function handler(req, res) {
  try {
    res.status(200).json(await 뼈대준비(req.body ?? {}, 환경만들기(루트)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
```

`api/talk-draft.js`는 `뼈대준비`를 `원고준비`로 바꾼 것과 같다.

- [ ] **Step 2: `vercel.json`에 화면 경로 하나를 더한다**

API는 `api/*.js` 파일 이름으로 자동 연결되므로 `rewrites`가 필요 없다. `"api/*.js"` 글로브가 새 파일 셋을 이미 덮으므로 `functions`도 그대로 둔다. 더할 것은 `/talk` 화면 경로 한 줄이다. `"/watchtower"` 줄 아래에 넣는다.

```json
    { "source": "/talk", "destination": "/web/index.html" }
```

넣은 뒤 `"/watchtower"` 줄 끝에 쉼표를 붙이는 것을 잊지 않는다.

- [ ] **Step 3: 홈 카드를 활성으로 바꾼다**

`web/index.html:69-73`의 `연설` 카드다.

```html
          <button class="service-card active-card" data-view="talk" type="button">
            <span class="service-kicker">연설 준비</span>
            <strong>연설</strong>
            <span>그 주 배정과 공개강연 개요로 원고를 준비합니다.</span>
          </button>
```

상단 내비게이션(`web/index.html:35-39`)에도 한 줄 더한다.

```html
        <button class="nav-button" data-view="talk" type="button">연설</button>
```

- [ ] **Step 4: 연설 화면 절을 더한다**

`web/index.html`에서 `<section id="watchtower" ...>` 바로 뒤에 넣는다. 클래스 이름은 기존 절의 것을 그대로 쓴다.

```html
      <section id="talk" class="view" aria-labelledby="talk-title">
        <div class="workspace-head">
          <div>
            <p class="eyebrow">연설 준비</p>
            <h2 id="talk-title">어떤 배정을 준비할까요?</h2>
          </div>
          <label>주 <select id="talk-week"></select></label>
        </div>

        <details id="talk-speaker" open>
          <summary>화자</summary>
          <label>성별 <select id="talk-gender"><option>형제</option><option>자매</option></select></label>
          <label>연령 <input id="talk-age" type="number" min="10" max="110" value="35"></label>
          <label>임명 <select id="talk-role"></select></label>
          <label><input id="talk-pioneer" type="checkbox"> 파이오니아</label>
          <label>스타일 <select id="talk-style"></select></label>
          <label>분당 글자수 <input id="talk-cpm" type="number" min="150" max="600" value="320"></label>
          <label>문체 견본 <textarea id="talk-sample" rows="4" placeholder="잘 된 지난 원고를 붙여넣으십시오."></textarea></label>
        </details>

        <div id="talk-assignments" class="service-grid" aria-live="polite"></div>

        <form id="talk-public" hidden>
          <h3>일요일 공개강연</h3>
          <label>제목 <input id="talk-public-title" required></label>
          <label>주제 성구 <input id="talk-public-verse" placeholder="마태 6:10"></label>
          <label>배정 시간(분) <input id="talk-public-minutes" type="number" min="5" max="60" value="30"></label>
          <div id="talk-public-points"></div>
          <button id="talk-public-add" type="button">소제목 칸 추가</button>
          <p id="talk-public-error" class="warning" hidden></p>
        </form>

        <button id="talk-build-outline" type="button" disabled>뼈대 만들기</button>

        <div id="talk-outline-area" hidden>
          <h3>뼈대</h3>
          <table id="talk-outline"><thead><tr><th>구간</th><th>시작</th><th>끝</th><th>목적</th></tr></thead><tbody></tbody></table>
          <p id="talk-outline-time"></p>
          <button id="talk-build-draft" type="button">원고 만들기</button>
        </div>

        <div id="talk-output" hidden>
          <div class="topnav" role="tablist">
            <button class="nav-button active" data-tab="준비원고" type="button">준비용 원고</button>
            <button class="nav-button" data-tab="낭독대본" type="button">낭독용 대본</button>
            <button class="nav-button" data-tab="큐카드" type="button">연단 큐카드</button>
            <button class="nav-button" data-tab="점검표" type="button">자기 점검표</button>
          </div>
          <p id="talk-warnings" class="warning" hidden></p>
          <pre id="talk-text"></pre>
          <button id="talk-copy" type="button">복사</button>
          <button id="talk-download" type="button">내려받기</button>
        </div>
      </section>
```

`web/styles.css`에는 `.warning`이 없으면 한 규칙만 더한다. 이미 있으면 건드리지 않는다.

```css
.warning { color: #b03030; }
```

- [ ] **Step 5: `web/app.js`에 동작을 붙인다**

기존 화면 전환과 복사 버튼의 관행을 그대로 따른다. 새로 쓰는 것은 이 다섯이다.

```js
const 프로필키 = 'jw-assistant-talk-profile';
// 과제 4의 기본프로필() 과 같은 값이다. 브라우저 코드는 서버 모듈을 import 하지 못하므로 여기에 다시 적는다.
const 기본프로필값 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };
const 스타일목록 = ['논리형', '설득형', '이야기형', '따뜻한 격려형', '질문형'];
const 임명목록 = ['장로', '봉사의 종', '미임명'];

function 프로필읽기() {
  try {
    return { ...기본프로필값, ...JSON.parse(localStorage.getItem(프로필키) ?? '{}') };
  } catch {
    return { ...기본프로필값 };
  }
}

function 프로필쓰기(프로필) {
  localStorage.setItem(프로필키, JSON.stringify(프로필));
}

function 내려받기(이름, 본문) {
  const blob = new Blob([본문], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 이름;
  a.click();
  URL.revokeObjectURL(a.href);
}

function 파일이름(날짜, 제목, 산출물) {
  const 안전한제목 = String(제목).replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
  return `${날짜}-${안전한제목}-${산출물}.md`;
}
```

배정 카드는 `가능`이 `false`면 `disabled`를 붙이고 `사유`를 함께 그린다. 숨기지 않는다.

- [ ] **Step 6: 화면을 직접 열어 확인한다**

Run: `npm run web`

브라우저에서 확인할 것은 다섯이다.

1. 홈에 `연설` 카드가 활성이고 눌린다.
2. 주를 고르면 배정 카드가 뜬다. 자매 프로필로 바꾸면 학생 연설 카드가 회색이 되고 사유가 보인다.
3. 공개강연 카드를 누르면 입력 칸이 열리고, 제목을 비우면 생성 버튼이 막힌다.
4. 뼈대가 표로 보이고 시간을 고치면 합계가 따라 바뀐다.
5. 탭 네 개가 각각 다른 내용을 보이고, 복사와 내려받기가 동작한다.

- [ ] **Step 7: 전체 테스트를 돌린다**

Run: `npm test`
Expected: 실패 0개.

- [ ] **Step 8: 커밋한다**

```bash
git add api/ vercel.json web/
git commit -m "연설 화면과 Vercel 어댑터를 붙인다"
```

---

### Task 13: 실물로 한 번 만들어 본다

**Files:**
- Create: `activities/talks/2026-08-24/생성-비교.md`
- Modify: `README.md`
- Modify: `docs/핵심-운영-인수인계.md`

**Interfaces:**
- Consumes: 앞의 모든 것.
- Produces: 없음. 사람이 하는 검증이다.

- [ ] **Step 1: 손으로 만든 원고와 같은 배정으로 돌려 본다**

`OPENAI_API_KEY`를 넣고 `npm run web` 을 켠다. 2026년 8월 24-30일 주를 고르고 `4. 대화 시작하기`를 고른다. 프로필은 형제, 35세, 미임명, 논리형이며 문체 견본으로 `activities/talks/2026-08-24/대화-시작하기-호별-방문-원고.md` 의 원고 절만 붙여넣는다.

- [ ] **Step 2: 손으로 만든 것과 견줘 `생성-비교.md` 에 적는다**

적을 것은 다섯이다.

1. 「랑제」 3과 요점 4가 원고 안에서 실제로 드러나는가.
2. 성구 본문이 `core/bible/text/` 의 문장과 글자 그대로 같은가.
3. 예상 시간이 실제로 소리 내어 읽은 시간과 얼마나 차이 나는가. 그 값으로 `분당글자수`를 조정한다.
4. 낭독용 대본이 보조자와 나눠 갖기에 실제로 쓸 만한가.
5. 손으로 만든 원고보다 못한 점 세 가지.

- [ ] **Step 3: 1번 보물 연설도 돌려 본다**

임명을 `장로`로 바꾸고 `1. 여호와께서는 자신의 종들을 적절한 정도로 징계하십니다`를 고른다. 교재의 소제목 셋이 글자 그대로 남아 있는지 확인한다. 한 글자라도 다르면 `소제목지키기`가 새는 것이므로 과제 10으로 돌아간다.

- [ ] **Step 4: 배포판에서도 되는지 확인한다**

`main`에 올린 뒤 `https://jw-assistant-seven.vercel.app/` 에서 같은 것을 한 번 돌린다. `ETIMEDOUT`이 나면 어느 경로에서 났는지 `docs/핵심-운영-인수인계.md`에 적는다.

- [ ] **Step 5: `README.md`에 절을 더한다**

`## 웹앱` 절 아래에 `## 연설 준비` 를 더한다. 적을 것은 넷이다. 지원하는 연설 네 종류, 공개강연은 개요를 직접 입력해야 한다는 것, 산출물 네 가지, `npm run refresh:teaching-lessons` 를 언제 다시 돌리는지다.

- [ ] **Step 6: 커밋한다**

```bash
git add activities/talks/2026-08-24/생성-비교.md README.md docs/핵심-운영-인수인계.md
git commit -m "연설 기능을 실물로 검증하고 문서를 갱신한다"
```

---

## 하지 않는 것

- 로그인, 계정, 사용자별 저장, 작업내역.
- 노션 저장.
- 「익」 연동.
- 자유 주제 연설.
- 서버에 산출물 저장.
- 원고 자동 축약.
- 외부 npm 의존성 추가.
- `src/ai-answer.mjs` 수정.
