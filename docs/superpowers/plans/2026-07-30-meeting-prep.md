# 2단계 `/집회준비` 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 그 주 파수대 연구 기사의 질문과 인용 성구를 wol 에서 받아, 성구 본문을 로컬 코어에서 펼친 예습지 마크다운을 자동으로 만든다.

**Architecture:** 순수 모듈 넷(라벨 해석·기사 파서·주 계산·예습지 생성)과 조립 스크립트 하나로 나눈다. 네트워크를 타는 곳은 조립 스크립트와 `wol-week.mjs` 의 fetch 부분뿐이며, 나머지는 네트워크 없이 시험한다. 성구 본문은 전량 `core/bible/text/` 에서 오고 스크립트가 넣으므로 기억에 의존한 인용이 섞일 수 없다.

**Tech Stack:** Node 24 ESM, `node --test`, 외부 의존성 없음.

**설계 문서:** `docs/superpowers/specs/2026-07-30-meeting-prep-design.md`

## Global Constraints

- Node 24 ESM. **외부 npm 의존성을 추가하지 않는다.**
- 새 소스 파일의 **첫 줄은 역할을 설명하는 한국어 한 줄 주석**이다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- 한국어 문장은 마침표로 끝낸다. **문장 끝에 콜론을 쓰지 않는다.**
- 줄을 나눌 때 `content.split('\n')` 을 직접 쓰지 말고 `src/text-lines.mjs` 의 `splitLines` 를 쓴다. CRLF 때문이다.
- 절 번호를 순회할 때는 `1..verses` 가 아니라 `firstVerseNumber..lastVerseNumber` 를 쓴다.
- 시험 파일은 대상 파일 옆에 `<이름>.test.mjs` 로 둔다. `npm test` 가 `node --test --no-warnings` 로 전부 돌린다.
- 코어 산출물이 없는 환경에서도 `npm test` 가 깨지지 않게, `core/bible/index.json` 을 요구하는 시험은 `{ skip }` 을 쓴다. 기존 `src/verse-address.test.mjs` 의 방식을 따른다.
- 기사 본문(문단 텍스트)은 저장소 어디에도 쓰지 않는다. 예습지에도, 픽스처에도 넣지 않는다.
- wol 접근은 반드시 로컬 Node 의 `fetch` 로 한다. Claude 의 WebFetch 는 타임아웃 난다.

## File Structure

| 파일 | 책임 | 순수성 |
|---|---|---|
| `src/citation-parse.mjs` | wol 성구 라벨 → 절 주소. 별칭·접미사·목록·범위·권 이어받기 | 순수 |
| `src/citation-parse.test.mjs` | 위의 시험 | |
| `src/html-text.mjs` | HTML 조각 → 사람이 읽는 한 줄 문자열. 두 파서가 함께 쓴다 | 순수 |
| `src/html-text.test.mjs` | 위의 시험 | |
| `src/wol-chapter.mjs` (수정) | 엔티티 디코딩을 `html-text.mjs` 에 넘긴다 | 순수 |
| `src/wol-article.mjs` | 기사 HTML → 제목·주제성구·요점·문단그룹 구조체 | 순수 |
| `src/wol-article.test.mjs` | 위의 시험 | |
| `tests/fixtures/파수대-기사-합성.html` | 실물 구조를 본뜬 합성 픽스처 | |
| `src/wol-week.mjs` | 날짜 → ISO 주 → 주 페이지 → 파수대 docId | 계산은 순수, 조회는 분리 |
| `src/wol-week.test.mjs` | 위의 시험 | |
| `src/prep-sheet.mjs` | 구조체 + 코어 → 예습지 마크다운 문자열 | 순수 |
| `src/prep-sheet.test.mjs` | 위의 시험 | |
| `scripts/prepare-meeting.mjs` | 조립·캐시·파일 쓰기·요약 출력 | 조립 |
| `.claude/skills/집회준비/SKILL.md` | 스크립트를 돌리고 대화하고 승급을 제안 | |
| `package.json` | `집회준비` 스크립트 등록 | |
| `README.md` | 사용법 문단 추가 | |

---

## Task 1: 성구 라벨 해석 (`src/citation-parse.mjs`)

이 단계에서 가장 조용히 틀리기 쉬운 자리다. 먼저 만들고 시험으로 못 박는다.

**Files:**
- Create: `src/citation-parse.mjs`
- Test: `src/citation-parse.test.mjs`

**Interfaces:**
- Consumes: `src/verse-address.mjs` 의 `loadIndex`, `toVerseId`
- Produces:
  - `별칭` — `Record<string, string>` 짧은 이름 → 인덱스의 정식 권 이름
  - `resolveBook(index, 이름)` → `{성공: true, book: number, title: string}` 또는 `{성공: false, 사유: string}`
  - `parseCitation(index, 라벨, 직전권 = null)` → `{성공: true, 권: number, title: string, 주소들: [{book, chapter, verse, verseId}]}` 또는 `{성공: false, 사유: string}`
  - `resolveAll(index, 인용들)` — `인용들` 은 `[{라벨, bid, 낭독}]` 문서 순서. 각 항목에 `해석` 을 붙인 새 배열을 준다. bid 그룹(`"23-1"` 의 `23`) 안에서만 직전 항목의 권을 이어받는다

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/citation-parse.test.mjs` 를 만든다.

```javascript
// wol 성구 라벨 해석이 실제 기사에 나온 형태를 전부 감당하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex, toVerseId } from './verse-address.mjs';
import { resolveBook, parseCitation, resolveAll } from './citation-parse.mjs';

const skip = !existsSync('core/bible/index.json');
const idx = skip ? null : loadIndex();

// 주소들을 "권-장:절" 문자열로 줄여 비교를 읽기 쉽게 한다
const 요약 = r => r.주소들.map(a => `${a.book}-${a.chapter}:${a.verse}`);

test('완전 일치하는 권 이름을 해석한다', { skip }, () => {
  assert.deepEqual(resolveBook(idx, '여호수아'), { 성공: true, book: 6, title: '여호수아' });
  assert.deepEqual(resolveBook(idx, '고린도 전서'), { 성공: true, book: 46, title: '고린도 전서' });
  // 공백을 빼도 같게 본다
  assert.deepEqual(resolveBook(idx, '고린도전서'), { 성공: true, book: 46, title: '고린도 전서' });
});

test('별칭표에 있는 권 이름을 해석한다', { skip }, () => {
  assert.equal(resolveBook(idx, '계시록').book, 66);
  assert.equal(resolveBook(idx, '요한').book, 43);
});

test('접두가 유일하면 그 권으로 해석한다', { skip }, () => {
  assert.equal(resolveBook(idx, '빌립보').book, 50);
  assert.equal(resolveBook(idx, '야고보').book, 59);
  assert.equal(resolveBook(idx, '히브리').book, 58);
  assert.equal(resolveBook(idx, '시').book, 19);
  assert.equal(resolveBook(idx, '전도').book, 21);
  assert.equal(resolveBook(idx, '에베소').book, 49);
  assert.equal(resolveBook(idx, '골로새').book, 51);
  assert.equal(resolveBook(idx, '마태').book, 40);
  assert.equal(resolveBook(idx, '신명').book, 5);
});

test('없는 권은 실패로 준다', { skip }, () => {
  const r = resolveBook(idx, '없는책');
  assert.equal(r.성공, false);
  assert.match(r.사유, /권을 찾을 수 없다/);
});

test('단일 절 라벨을 해석한다', { skip }, () => {
  const r = parseCitation(idx, '빌립보서 3:16');
  assert.equal(r.성공, true);
  assert.deepEqual(요약(r), ['50-3:16']);
  assert.equal(r.주소들[0].verseId, toVerseId(idx, 50, 3, 16));
});

test('같은 권의 짧은 표기와 긴 표기가 같은 절을 준다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '빌립보 3:16')), 요약(parseCitation(idx, '빌립보서 3:16')));
});

test('ㄱ·ㄴ 접미사를 떼고 해석한다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '야고보 4:8ㄱ')), ['59-4:8']);
  assert.deepEqual(요약(parseCitation(idx, '야고보 4:8ㄴ')), ['59-4:8']);
});

test('쉼표 목록을 낱개 주소로 펼친다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '마태 28:19, 20')), ['40-28:19', '40-28:20']);
  assert.deepEqual(요약(parseCitation(idx, '잠언 5:1, 2')), ['20-5:1', '20-5:2']);
  assert.deepEqual(요약(parseCitation(idx, '시 101:6, 7')), ['19-101:6', '19-101:7']);
});

test('붙임표 범위를 낱개 주소로 펼친다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '고린도 전서 3:18-20')), ['46-3:18', '46-3:19', '46-3:20']);
  assert.deepEqual(요약(parseCitation(idx, '디모데 후서 2:16-18')), ['55-2:16', '55-2:17', '55-2:18']);
  assert.deepEqual(요약(parseCitation(idx, '에베소 6:11-13')), ['49-6:11', '49-6:12', '49-6:13']);
});

test('후행 세미콜론을 무시한다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '여호수아 1:8;')), ['6-1:8']);
  assert.deepEqual(요약(parseCitation(idx, '시 133:1;')), ['19-133:1']);
});

test('권 이름이 없으면 직전 권을 이어받는다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '119:63', 19)), ['19-119:63']);
  assert.deepEqual(요약(parseCitation(idx, '10:31', 46)), ['46-10:31']);
});

test('권 이름이 없는데 직전 권도 없으면 실패로 준다', { skip }, () => {
  const r = parseCitation(idx, '119:63', null);
  assert.equal(r.성공, false);
  assert.match(r.사유, /앞선 권이 없다/);
});

test('후보가 여럿이면 조용히 고르지 않고 실패로 준다', { skip }, () => {
  const r = resolveBook(idx, '데살로니가');
  assert.equal(r.성공, false);
  assert.match(r.사유, /후보가 여럿이다/);
});

test('없는 절은 실패로 준다', { skip }, () => {
  const r = parseCitation(idx, '창세기 1:99');
  assert.equal(r.성공, false);
  assert.match(r.사유, /범위/);
});

test('예외를 던지지 않는다', { skip }, () => {
  assert.doesNotThrow(() => parseCitation(idx, '말도 안 되는 문자열'));
  assert.equal(parseCitation(idx, '말도 안 되는 문자열').성공, false);
});

test('bid 그룹 안에서만 권을 이어받는다', { skip }, () => {
  const 인용들 = [
    { 라벨: '시 101:6, 7;', bid: '23-1', 낭독: false },
    { 라벨: '119:63', bid: '23-2', 낭독: false },
    { 라벨: '10:31', bid: '24-1', 낭독: false },   // 그룹이 바뀌었으므로 이어받지 못한다
  ];
  const out = resolveAll(idx, 인용들);
  assert.equal(out[0].해석.성공, true);
  assert.deepEqual(요약(out[1].해석), ['19-119:63']);
  assert.equal(out[2].해석.성공, false);
  assert.match(out[2].해석.사유, /앞선 권이 없다/);
});

test('실제 기사의 bid 그룹을 그대로 재현한다', { skip }, () => {
  const 인용들 = [
    { 라벨: '에베소 6:11-13;', bid: '25-1', 낭독: false },
    { 라벨: '고린도 전서 9:26, 27;', bid: '25-2', 낭독: false },
    { 라벨: '10:31', bid: '25-3', 낭독: false },
  ];
  const out = resolveAll(idx, 인용들);
  assert.deepEqual(요약(out[2].해석), ['46-10:31']);   // 고린도 전서를 이어받는다
});

test('2026년 7월 27일 주간 기사의 라벨 34종이 전부 해석된다', { skip }, () => {
  const 라벨들 = [
    '빌립보 3:16', '빌립보서 3:16', '야고보 4:8ㄱ', '계시록 2:4', '고린도 전서 15:58',
    '마태 22:37', '여호수아 1:8;', '마태 28:19, 20;', '히브리 10:25', '마태 6:24',
    '골로새 2:8', '잠언 5:1, 2', '베드로 전서 5:8', '고린도 전서 3:18-20',
    '디모데 후서 2:16-18', '디모데 전서 4:15', '에베소서 5:15, 16', '시 133:1;',
    '잠언 18:1', '마태 6:33', '전도 4:6;', '디모데 전서 4:8', '잠언 21:5',
    '잠언 11:14', '고린도 전서 15:33', '잠언 13:20', '시 101:6, 7;', '시 1:1',
    '에베소 6:11-13;', '고린도 전서 9:26, 27;', '고린도 후서 13:5', '잠언 3:5, 6',
  ];
  const 실패 = 라벨들.filter(l => !parseCitation(idx, l).성공);
  assert.deepEqual(실패, [], `해석하지 못한 라벨이 있다: ${실패.join(' / ')}`);
});
```

- [ ] **Step 2: 시험이 실패하는 것을 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './citation-parse.mjs'`

- [ ] **Step 3: 구현한다**

`src/citation-parse.mjs` 를 만든다.

```javascript
// wol 출판물의 성구 라벨을 성경 절 주소로 해석하는 모듈
import { toVerseId } from './verse-address.mjs';

// 규칙(완전 일치 → 접두 유일 일치)으로 풀리지 않는 것만 여기에 둔다.
// 미해결로 드러난 약칭이 생기면 한 줄씩 추가한다.
export const 별칭 = {
  '계시록': '요한 계시록',   // 접미가 아니라 접두를 잘라 쓰므로 규칙으로 안 풀린다
  '요한': '요한복음',        // 요한 1·2·3서·계시록과 겹치므로 접두 유일 일치가 안 된다
};

const 압축 = s => String(s).replace(/\s+/g, '');

export function resolveBook(index, 이름) {
  const 원본 = String(이름).trim();
  if (!원본) return { 성공: false, 사유: '권 이름이 비어 있다' };
  const key = 압축(원본);

  const 완전 = index.books.find(b => 압축(b.title) === key);
  if (완전) return { 성공: true, book: 완전.num, title: 완전.title };

  const 별칭이름 = 별칭[원본] ?? 별칭[key];
  if (별칭이름) {
    const b = index.books.find(x => x.title === 별칭이름);
    if (b) return { 성공: true, book: b.num, title: b.title };
  }

  const 후보 = index.books.filter(b => 압축(b.title).startsWith(key));
  if (후보.length === 1) return { 성공: true, book: 후보[0].num, title: 후보[0].title };
  if (후보.length > 1) {
    return { 성공: false, 사유: `권 이름이 모호하다 — 후보가 여럿이다: ${원본} → ${후보.map(b => b.title).join(', ')}` };
  }
  return { 성공: false, 사유: `권을 찾을 수 없다: ${원본}` };
}

// "야고보 4:8ㄱ" 의 ㄱ·ㄴ 은 절의 앞부분·뒷부분을 가리키는 표시일 뿐 절 번호가 아니다.
// 숫자 바로 뒤에 붙은 낱자모만 떼어 낸다.
function 정규화(라벨) {
  return String(라벨)
    .replace(/[;.\s]+$/, '')
    .replace(/(\d)[ㄱ-ㅎ]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCitation(index, 라벨, 직전권 = null) {
  const t = 정규화(라벨);
  const m = t.match(/^(.*?)\s*(\d+):([\d,\s-]+)$/);
  if (!m) return { 성공: false, 사유: `성구 형식을 해석할 수 없다: ${라벨}` };

  const 책이름 = m[1].trim();
  let book, title;
  if (책이름) {
    const r = resolveBook(index, 책이름);
    if (!r.성공) return r;
    book = r.book;
    title = r.title;
  } else {
    if (직전권 == null) {
      return { 성공: false, 사유: `권 이름이 없는데 이어받을 앞선 권이 없다: ${라벨}` };
    }
    book = 직전권;
    title = index.books.find(b => b.num === book)?.title ?? String(book);
  }

  const chapter = Number(m[2]);
  const 절들 = [];
  for (const 조각 of m[3].split(',')) {
    const s = 조각.trim();
    if (!s) continue;
    const 범위 = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (범위) {
      const from = Number(범위[1]);
      const to = Number(범위[2]);
      if (to < from) return { 성공: false, 사유: `범위가 거꾸로 됐다: ${라벨}` };
      for (let v = from; v <= to; v++) 절들.push(v);
      continue;
    }
    if (/^\d+$/.test(s)) { 절들.push(Number(s)); continue; }
    return { 성공: false, 사유: `절 표기를 해석할 수 없다: ${라벨}` };
  }
  if (!절들.length) return { 성공: false, 사유: `절이 없다: ${라벨}` };

  const 주소들 = [];
  for (const verse of 절들) {
    let verseId;
    try {
      verseId = toVerseId(index, book, chapter, verse);
    } catch (e) {
      return { 성공: false, 사유: `${e.message} (${라벨})` };
    }
    주소들.push({ book, chapter, verse, verseId });
  }
  return { 성공: true, 권: book, title, 주소들 };
}

// 같은 괄호 안의 참조는 data-bid 의 그룹 번호가 같다.
// 권 이름 생략은 그 그룹 안에서만 직전 항목으로부터 이어받는다.
export function resolveAll(index, 인용들) {
  let 현재그룹 = null;
  let 직전권 = null;
  return 인용들.map(c => {
    const 그룹 = String(c.bid ?? '').split('-')[0];
    if (그룹 !== 현재그룹) {
      현재그룹 = 그룹;
      직전권 = null;
    }
    const 해석 = parseCitation(index, c.라벨, 직전권);
    if (해석.성공) 직전권 = 해석.권;
    return { ...c, 해석 };
  });
}
```

- [ ] **Step 4: 시험이 통과하는 것을 확인한다**

Run: `npm test`
Expected: PASS — 새 시험 17개를 포함해 전부 통과

- [ ] **Step 5: 커밋한다**

```bash
git add src/citation-parse.mjs src/citation-parse.test.mjs
git commit -m "성구 라벨 해석 모듈 추가 — 별칭·접미사·목록·범위·권 이어받기"
```

---

## Task 1.5: HTML 텍스트 추출 공통화 (`src/html-text.mjs`)

`src/wol-chapter.mjs` 의 `toPlainText` 가 엔티티 디코딩과 공백 정리를 하고 있고, Task 2 의 파서도 같은 일이 필요하다. 복사본을 두 개 두면 나중에 한쪽만 고쳐 어긋난다. 먼저 뽑아 둔다.

**Files:**
- Create: `src/html-text.mjs`
- Test: `src/html-text.test.mjs`
- Modify: `src/wol-chapter.mjs` — `toPlainText` 가 새 모듈을 부르게 한다

**Interfaces:**
- Consumes: 없음
- Produces: `htmlToText(fragment)` → `string`. 태그를 걷어내고 HTML 엔티티를 디코딩하며 연속 공백을 하나로 줄이고 양끝을 다듬는다

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/html-text.test.mjs` 를 만든다.

```javascript
// HTML 조각을 사람이 읽는 문자열로 바꾸는 일이 정확한지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText } from './html-text.mjs';

test('태그를 걷어낸다', () => {
  assert.equal(htmlToText('<p>가나<strong>다라</strong></p>'), '가나다라');
});

test('이름 있는 엔티티를 디코딩한다', () => {
  assert.equal(htmlToText('가&nbsp;나'), '가 나');
  assert.equal(htmlToText('&lt;&gt;&quot;'), '<>"');
  assert.equal(htmlToText('가&mdash;나'), '가—나');
  assert.equal(htmlToText('&copy;'), '©');
});

test('숫자 엔티티를 10진수와 16진수 모두 디코딩한다', () => {
  assert.equal(htmlToText('&#44032;'), '가');
  assert.equal(htmlToText('&#xAC00;'), '가');
});

test('&amp; 를 마지막에 풀어 이중 디코딩을 막는다', () => {
  assert.equal(htmlToText('&amp;lt;'), '&lt;');
});

test('연속 공백을 하나로 줄이고 양끝을 다듬는다', () => {
  assert.equal(htmlToText('  가\n\n  나  '), '가 나');
});

test('빈 입력에도 안전하다', () => {
  assert.equal(htmlToText(''), '');
  assert.equal(htmlToText('<span></span>'), '');
});
```

- [ ] **Step 2: 시험이 실패하는 것을 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './html-text.mjs'`

- [ ] **Step 3: 구현한다**

`src/html-text.mjs` 를 만든다.

```javascript
// HTML 조각에서 태그와 엔티티를 걷어내 사람이 읽는 한 줄 문자열로 만드는 모듈
export function htmlToText(fragment) {
  return String(fragment)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&copy;/g, '©')
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    // &amp; 는 마지막에 푼다. 먼저 풀면 "&amp;lt;" 가 "<" 로 이중 디코딩된다
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
```

- [ ] **Step 4: `wol-chapter.mjs` 가 새 모듈을 쓰게 한다**

`src/wol-chapter.mjs` 의 `toPlainText` 를 아래로 바꾸고, 파일 위쪽 import 에 한 줄을 더한다. 절 앵커와 참조·각주 링크를 통째로 지우는 부분은 이 파서만의 일이므로 그대로 둔다.

```javascript
import { htmlToText } from './html-text.mjs';
```

```javascript
function toPlainText(fragment) {
  return htmlToText(
    fragment
      // 절/장 번호 표시 앵커를 통째로 제거한다 (장의 첫 절은 절 번호 대신 장 번호가 나온다).
      .replace(/<a\b[^>]*class="[^"]*\bvp\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
      // 상호참조(+) 와 각주(*) 링크를 통째로 제거한다
      .replace(/<a\b[^>]*class="[^"]*\bb\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
      .replace(/<a\b[^>]*class="[^"]*\bfn\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
  );
}
```

- [ ] **Step 5: 회귀가 없는지 확인한다**

Run: `npm test`
Expected: PASS — 새 시험 6개와 기존 `src/wol-chapter.test.mjs` 가 모두 통과한다. 기존 시험이 깨지면 `htmlToText` 가 원래 동작과 어긋난 것이므로 되돌려 맞춘다.

- [ ] **Step 6: 본문이 바뀌지 않았는지 실측으로 확인한다**

Run: `npm run verify`
Expected: PASS — 수집된 본문 31,194절이 인덱스 기준선과 그대로 일치한다

- [ ] **Step 7: 커밋한다**

```bash
git add src/html-text.mjs src/html-text.test.mjs src/wol-chapter.mjs
git commit -m "HTML 텍스트 추출을 html-text.mjs 로 뽑아 두 파서가 함께 쓰게 한다"
```

---

## Task 2: 기사 파서 (`src/wol-article.mjs`)

**Files:**
- Create: `tests/fixtures/파수대-기사-합성.html`
- Create: `src/wol-article.mjs`
- Test: `src/wol-article.test.mjs`

**Interfaces:**
- Consumes: Task 1.5 의 `src/html-text.mjs` 의 `htmlToText`
- Produces:
  - `parseArticle(html)` → `{주라벨, 제목, 노래, 요점, 주제성구, 문단그룹}`
    - `주제성구` — `{인용문: string, 라벨: string, bid: string}` 또는 `null`
    - `문단그룹` — `[{질문: string, 문단번호: number[], 인용: [{라벨, bid, 낭독}]}]` 문서 순서
    - 파싱이 통째로 실패하면 예외를 던진다. 조립 스크립트가 이를 잡아 무엇이 비었는지 보고한다

- [ ] **Step 1: 합성 픽스처를 만든다**

`tests/fixtures/파수대-기사-합성.html` 을 만든다. 구조는 실물을 본떴고, 문단 본문 자리는 더미 텍스트다. 성구 라벨만 실제로 나온 것을 쓴다.

```html
<article id="article" class="article document html5 pub-w docId-9999999 pub-w26 docClass-40" lang="ko">
<div class="scalableui">
<header>
<div id="tt2"><p class="contextTtl" id="p1" data-pid="1"><strong>2026년 7월 27일–8월 2일</strong></p></div>
<div id="tt4"><p id="p2" data-pid="2" class="pubRefs"><a href="/ko/wol/pc/r8/lp-ko/9999999/0/0"><strong>노래 56</strong></a> 더미 노래 제목</p></div>
<h1 id="p3" data-pid="3"><strong>더미 기사 제목</strong></h1>
</header>
<div id="tt8"><p id="p4" data-pid="4" class="themeScrp"><em>“더미 주제 성구 인용문.”</em>—<a href="/ko/wol/bc/r8/lp-ko/9999999/0/0" data-bid="1-1" class="b">빌립보 3:16</a>.</p></div>
<div id="tt10">
<p id="p5" data-pid="5" class="pubRefs"><strong>요점</strong></p>
<p id="p6" data-pid="6" class="pubRefs">더미 요점 문장이다.</p>
</div>
<div class="bodyTxt">
<p id="p46" data-pid="46" class="qu"><strong>1-2.</strong> (ㄱ) 더미 질문 첫 부분입니까? (ㄴ) 더미 질문 둘째 부분입니까? (<a href="/ko/wol/bc/r8/lp-ko/9999999/27/0" data-bid="28-1" class="b">빌립보서 3:16</a>)</p>
<p id="p7" data-pid="7" data-rel-pid="[46]"><span class="parNum" data-pnum="1"></span>더미 문단 본문이다. (<a href="/ko/wol/bc/r8/lp-ko/9999999/1/0" data-bid="2-1" class="b">야고보 4:8ㄱ</a>) 더미 문장이 이어진다.—<a href="/ko/wol/bc/r8/lp-ko/9999999/2/0" data-bid="3-1" class="b"><strong>빌립보서 3:16</strong></a> <strong>낭독.</strong></p>
<p id="p8" data-pid="8" data-rel-pid="[46]"><span class="parNum" data-pnum="2"><strong><sup>2</sup></strong></span> 더미 둘째 문단이다. (<a href="/ko/wol/bc/r8/lp-ko/9999999/3/0" data-bid="4-1" class="b">계시록 2:4</a>)</p>
<p id="p47" data-pid="47" class="qu"><strong>3.</strong> 더미 셋째 질문입니까?</p>
<p id="p9" data-pid="9" data-rel-pid="[47]"><span class="parNum" data-pnum="3"><strong><sup>3</sup></strong></span> 더미 셋째 문단이다. (<a href="/ko/wol/bc/r8/lp-ko/9999999/23/0" data-bid="23-1" class="b">시 101:6, 7;</a> <a href="/ko/wol/bc/r8/lp-ko/9999999/24/0" data-bid="23-2" class="b">119:63</a>)</p>
<p id="p48" data-pid="48" class="qu"><strong>4-5.</strong> 더미 넷째 질문입니까?</p>
<p id="p10" data-pid="10" data-rel-pid="[48]"><span class="parNum" data-pnum="4"><strong><sup>4</sup></strong></span> 더미 넷째 문단이다. (<a href="/ko/wol/bc/r8/lp-ko/9999999/25/0" data-bid="25-1" class="b">에베소 6:11-13;</a> <a href="/ko/wol/bc/r8/lp-ko/9999999/26/0" data-bid="25-2" class="b">고린도 전서 9:26, 27;</a> <a href="/ko/wol/bc/r8/lp-ko/9999999/27/0" data-bid="25-3" class="b">10:31</a>)</p>
<p id="p11" data-pid="11" data-rel-pid="[48]"><span class="parNum" data-pnum="5"><strong><sup>5</sup></strong></span> 더미 다섯째 문단이다. 인용 성구가 없다.</p>
</div>
</div>
</article>
```

- [ ] **Step 2: 실패하는 시험을 쓴다**

`src/wol-article.test.mjs` 를 만든다.

```javascript
// 파수대 기사 HTML 에서 예습에 필요한 구조가 정확히 뽑히는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseArticle } from './wol-article.mjs';

const html = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8');
const 기사 = parseArticle(html);

test('머리말 항목을 뽑는다', () => {
  assert.equal(기사.주라벨, '2026년 7월 27일–8월 2일');
  assert.equal(기사.제목, '더미 기사 제목');
  assert.equal(기사.노래, '노래 56 더미 노래 제목');
  assert.equal(기사.요점, '더미 요점 문장이다.');
});

test('주제 성구를 인용문과 라벨로 나눠 뽑는다', () => {
  assert.equal(기사.주제성구.라벨, '빌립보 3:16');
  assert.equal(기사.주제성구.bid, '1-1');
  assert.match(기사.주제성구.인용문, /더미 주제 성구 인용문/);
});

test('문단그룹을 data-rel-pid 로 묶는다', () => {
  // 픽스처의 질문은 p46·p47·p48 세 개다
  assert.equal(기사.문단그룹.length, 3);
  assert.deepEqual(기사.문단그룹.map(g => g.문단번호), [[1, 2], [3], [4, 5]]);
});

test('질문 본문에서 태그를 걷어낸다', () => {
  assert.match(기사.문단그룹[0].질문, /^1-2\./);
  assert.match(기사.문단그룹[0].질문, /더미 질문 첫 부분입니까/);
  assert.doesNotMatch(기사.문단그룹[0].질문, /</);
});

test('질문 안의 인용도 그 그룹에 담는다', () => {
  const 라벨들 = 기사.문단그룹[0].인용.map(c => c.라벨);
  assert.deepEqual(라벨들, ['빌립보서 3:16', '야고보 4:8ㄱ', '빌립보서 3:16', '계시록 2:4']);
});

test('낭독 표시를 잡아낸다', () => {
  const 낭독들 = 기사.문단그룹[0].인용.filter(c => c.낭독).map(c => c.bid);
  assert.deepEqual(낭독들, ['3-1']);
});

test('bid 를 문서 순서대로 보존한다', () => {
  assert.deepEqual(기사.문단그룹[2].인용.map(c => c.bid), ['25-1', '25-2', '25-3']);
});

test('인용이 없는 문단도 그룹에 포함된다', () => {
  assert.deepEqual(기사.문단그룹[2].문단번호, [4, 5]);
});

test('구조가 없는 HTML 은 예외를 던진다', () => {
  assert.throws(() => parseArticle('<html><body>아무것도 없다</body></html>'), /기사 구조/);
});
```

- [ ] **Step 3: 시험이 실패하는 것을 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './wol-article.mjs'`

- [ ] **Step 4: 구현한다**

`src/wol-article.mjs` 를 만든다.

```javascript
// wol 파수대 연구 기사 HTML 에서 질문·문단·인용 성구 구조를 뽑아내는 파서
import { htmlToText as 텍스트 } from './html-text.mjs';

const 인용태그 = /<a\b[^>]*href="\/ko\/wol\/bc\/[^"]*"[^>]*data-bid="([^"]+)"[^>]*class="[^"]*\bb\b[^"]*"[^>]*>([\s\S]*?)<\/a>/g;

// <p ...>...</p> 를 순서대로 모두 잘라낸다. 속성과 본문을 함께 준다
function 문단들(html) {
  const out = [];
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) out.push({ 속성: m[1], 본문: m[2] });
  return out;
}

const 속성값 = (속성, 이름) => (속성.match(new RegExp(`${이름}="([^"]*)"`)) || [])[1] ?? null;

function 인용뽑기(본문) {
  const out = [];
  인용태그.lastIndex = 0;
  let m;
  while ((m = 인용태그.exec(본문))) {
    const 뒤 = 본문.slice(인용태그.lastIndex, 인용태그.lastIndex + 60);
    out.push({
      bid: m[1],
      라벨: 텍스트(m[2]),
      낭독: /낭독/.test(텍스트(뒤).slice(0, 8)),
    });
  }
  return out;
}

export function parseArticle(html) {
  const ps = 문단들(html);

  const 주라벨p = ps.find(p => /class="[^"]*\bcontextTtl\b/.test(p.속성));
  const 제목m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  if (!주라벨p || !제목m) throw new Error('기사 구조를 찾을 수 없다 — 주 라벨이나 제목이 없다');

  const 노래p = ps.find(p => /class="[^"]*\bpubRefs\b/.test(p.속성) && /노래/.test(텍스트(p.본문)));
  const 주제p = ps.find(p => /class="[^"]*\bthemeScrp\b/.test(p.속성));

  // "요점" 이라는 낱말만 든 문단 바로 다음 문단이 요점 본문이다
  const 요점표시 = ps.findIndex(p => 텍스트(p.본문) === '요점');
  const 요점 = 요점표시 >= 0 && ps[요점표시 + 1] ? 텍스트(ps[요점표시 + 1].본문) : '';

  let 주제성구 = null;
  if (주제p) {
    const c = 인용뽑기(주제p.본문)[0];
    const 인용문m = 주제p.본문.match(/<em\b[^>]*>([\s\S]*?)<\/em>/);
    if (c) 주제성구 = { 인용문: 인용문m ? 텍스트(인용문m[1]) : '', 라벨: c.라벨, bid: c.bid };
  }

  // 질문 문단(class="qu")을 pid 로 색인하고, data-rel-pid 를 가진 문단을 그 아래에 붙인다
  const 그룹 = new Map();
  const 순서 = [];
  for (const p of ps) {
    if (!/class="[^"]*\bqu\b/.test(p.속성)) continue;
    const pid = 속성값(p.속성, 'data-pid');
    if (!pid) continue;
    그룹.set(pid, { 질문: 텍스트(p.본문), 문단번호: [], 인용: 인용뽑기(p.본문) });
    순서.push(pid);
  }
  if (!그룹.size) throw new Error('기사 구조를 찾을 수 없다 — 질문 문단이 하나도 없다');

  for (const p of ps) {
    const rel = 속성값(p.속성, 'data-rel-pid');
    if (!rel) continue;
    const 대상 = 그룹.get(rel.replace(/[[\]]/g, '').split(',')[0].trim());
    if (!대상) continue;
    const pnum = (p.본문.match(/class="parNum"[^>]*data-pnum="(\d+)"/) || [])[1];
    if (pnum) 대상.문단번호.push(Number(pnum));
    대상.인용.push(...인용뽑기(p.본문));
  }

  return {
    주라벨: 텍스트(주라벨p.본문),
    제목: 텍스트(제목m[1]),
    노래: 노래p ? 텍스트(노래p.본문) : '',
    요점,
    주제성구,
    문단그룹: 순서.map(pid => 그룹.get(pid)),
  };
}
```

- [ ] **Step 5: 시험이 통과하는 것을 확인한다**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: 커밋한다**

```bash
git add src/wol-article.mjs src/wol-article.test.mjs tests/fixtures/파수대-기사-합성.html
git commit -m "파수대 기사 파서 추가 — 합성 픽스처로 네트워크 없이 시험한다"
```

---

## Task 3: 주 계산과 기사 찾기 (`src/wol-week.mjs`)

**Files:**
- Create: `src/wol-week.mjs`
- Test: `src/wol-week.test.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `isoWeek(date)` → `{year: number, week: number}`
  - `weekStart(date)` → `'YYYY-MM-DD'` — 그 주 월요일
  - `weekPageUrl(year, week)` → `string`
  - `articleUrl(docId)` → `string`
  - `parseWeekPage(html)` → `{파수대docId: string, 교재docId: string|null}`. 파수대를 못 찾으면 예외를 던진다

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/wol-week.test.mjs` 를 만든다.

```javascript
// ISO 주 계산과 주간 집회 페이지에서 파수대 docId 를 고르는 일을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, weekStart, weekPageUrl, articleUrl, parseWeekPage } from './wol-week.mjs';

test('ISO 주를 계산한다', () => {
  assert.deepEqual(isoWeek(new Date('2026-07-30T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-07-27T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-08-02T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-08-03T00:00:00Z')), { year: 2026, week: 32 });
});

test('연말 연초 경계에서도 맞는다', () => {
  // 2026-01-01 은 목요일이므로 2026년 1주다
  assert.deepEqual(isoWeek(new Date('2026-01-01T00:00:00Z')), { year: 2026, week: 1 });
  // 2025-12-29 는 월요일이며 2026년 1주에 속한다
  assert.deepEqual(isoWeek(new Date('2025-12-29T00:00:00Z')), { year: 2026, week: 1 });
  // 2027-01-01 은 금요일이므로 2026년 53주에 속한다
  assert.deepEqual(isoWeek(new Date('2027-01-01T00:00:00Z')), { year: 2026, week: 53 });
});

test('그 주 월요일을 준다', () => {
  assert.equal(weekStart(new Date('2026-07-30T00:00:00Z')), '2026-07-27');
  assert.equal(weekStart(new Date('2026-07-27T00:00:00Z')), '2026-07-27');
  assert.equal(weekStart(new Date('2026-08-02T00:00:00Z')), '2026-07-27');
});

test('URL 을 만든다', () => {
  assert.equal(weekPageUrl(2026, 31), 'https://wol.jw.org/ko/wol/meetings/r8/lp-ko/2026/31');
  assert.equal(articleUrl('2026403'), 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2026403');
});

test('주간 페이지에서 파수대 docId 를 고른다', () => {
  const html = `
    <li class="todayItem today html5 pub- docId-202026244 pub-mwb26 docClass-106">교재</li>
    <li class="todayItem publicationCitation html5 pub-w docId-2026403 pub-w26 docClass-40">파수대</li>
  `;
  assert.deepEqual(parseWeekPage(html), { 파수대docId: '2026403', 교재docId: '202026244' });
});

test('파수대 항목이 없으면 예외를 던진다', () => {
  const html = '<li class="todayItem pub- docId-202026244 pub-mwb26">교재만 있다</li>';
  assert.throws(() => parseWeekPage(html), /파수대/);
});
```

- [ ] **Step 2: 시험이 실패하는 것을 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './wol-week.mjs'`

- [ ] **Step 3: 구현한다**

`src/wol-week.mjs` 를 만든다.

```javascript
// 날짜로 그 주의 wol 집회 페이지를 찾아 파수대 연구 기사 docId 를 얻는 모듈
const 하루 = 86400000;

// 요일을 월=1 … 일=7 로 센다
function 요일(d) {
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay();
}

function 월요일(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - (요일(d) - 1) * 하루);
}

export function isoWeek(date) {
  // 그 주 목요일이 속한 해가 ISO 기준 연도다
  const 목 = new Date(월요일(date).getTime() + 3 * 하루);
  const 첫목 = new Date(Date.UTC(목.getUTCFullYear(), 0, 4));
  const 첫주월 = 월요일(첫목);
  const week = Math.round((목.getTime() - 첫주월.getTime()) / (7 * 하루)) + 1;
  return { year: 목.getUTCFullYear(), week };
}

export function weekStart(date) {
  return 월요일(date).toISOString().slice(0, 10);
}

export function weekPageUrl(year, week) {
  return `https://wol.jw.org/ko/wol/meetings/r8/lp-ko/${year}/${week}`;
}

export function articleUrl(docId) {
  return `https://wol.jw.org/ko/wol/d/r8/lp-ko/${docId}`;
}

// class 목록에 docId-… 가 있는 항목을 모두 훑는다.
// 파수대는 pub-w 라는 낱말이 통째로 들어 있고, 교재는 pub-mwb… 라 걸리지 않는다.
export function parseWeekPage(html) {
  let 파수대docId = null;
  let 교재docId = null;
  const re = /class="([^"]*\bdocId-(\d+)\b[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const 목록 = m[1].split(/\s+/);
    if (목록.includes('pub-w')) 파수대docId ??= m[2];
    else if (목록.some(c => c.startsWith('pub-mwb'))) 교재docId ??= m[2];
  }
  if (!파수대docId) throw new Error('주간 집회 페이지에서 파수대 기사를 찾을 수 없다');
  return { 파수대docId, 교재docId };
}
```

- [ ] **Step 4: 시험이 통과하는 것을 확인한다**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: 커밋한다**

```bash
git add src/wol-week.mjs src/wol-week.test.mjs
git commit -m "ISO 주 계산과 주간 집회 페이지 파서 추가"
```

---

## Task 4: 예습지 생성 (`src/prep-sheet.mjs`)

**Files:**
- Create: `src/prep-sheet.mjs`
- Test: `src/prep-sheet.test.mjs`

**Interfaces:**
- Consumes: `src/citation-parse.mjs` 의 `resolveAll`, `src/verse-address.mjs` 의 `toAddress`·`formatAddress`
- Produces:
  - `buildPrepSheet(기사, 도구, 출처)` → `{마크다운: string, 통계: {인용수, 해석수, 미해결: [{라벨, 사유}]}}`
    - `기사` — `parseArticle` 의 결과
    - `도구` — `{index, text, refs}`. `text` 는 `createTextReader` 결과, `refs` 는 `loadRefs` 결과
    - `출처` — `{기사URL, 주페이지URL, 조회날짜}`

- [ ] **Step 1: 실패하는 시험을 쓴다**

`src/prep-sheet.test.mjs` 를 만든다.

```javascript
// 예습지 마크다운이 코어 본문을 그대로 싣고 미해결을 숨기지 않는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { loadRefs } from './refs-lookup.mjs';
import { parseArticle } from './wol-article.mjs';
import { buildPrepSheet } from './prep-sheet.mjs';

const skip = !existsSync('core/bible/index.json') || !existsSync('core/bible/refs');
const html = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8');

function 만들기() {
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const 출처 = {
    기사URL: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/9999999',
    주페이지URL: 'https://wol.jw.org/ko/wol/meetings/r8/lp-ko/2026/31',
    조회날짜: '2026-07-30',
  };
  return buildPrepSheet(parseArticle(html), 도구, 출처);
}

test('머리말과 주제 성구를 싣는다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /2026년 7월 27일–8월 2일/);
  assert.match(마크다운, /더미 기사 제목/);
  assert.match(마크다운, /노래 56/);
});

test('성구 본문이 코어와 글자 단위로 같다', { skip }, () => {
  const index = loadIndex();
  const 본문 = createTextReader(index).verse(50, 3, 16);
  const { 마크다운 } = 만들기();
  assert.ok(본문, '빌립보서 3:16 본문이 코어에 있어야 한다');
  assert.ok(마크다운.includes(본문), '예습지가 코어 본문을 그대로 실어야 한다');
});

test('기사 문단 본문은 싣지 않는다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.doesNotMatch(마크다운, /더미 문단 본문이다/);
  assert.doesNotMatch(마크다운, /더미 둘째 문단이다/);
});

test('낭독 성구를 표시한다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /낭독/);
});

test('내 답 칸을 문단그룹마다 둔다', { skip }, () => {
  const { 마크다운 } = 만들기();
  const 칸수 = (마크다운.match(/\*\*내 답\*\*/g) || []).length;
  assert.equal(칸수, 3);
});

test('출처에 URL 과 조회 날짜를 남긴다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /2026-07-30 조회/);
  assert.match(마크다운, /lp-ko\/9999999/);
  assert.match(마크다운, /meetings\/r8\/lp-ko\/2026\/31/);
});

test('통계가 인용 수와 해석 수를 센다', { skip }, () => {
  const { 통계 } = 만들기();
  // 주제성구 1 + 질문 p46 안 1 + p7 2 + p8 1 + p9 2 + p10 3 = 10
  assert.equal(통계.인용수, 10);
  assert.equal(통계.해석수, 10);
  assert.deepEqual(통계.미해결, []);
});

test('해석 실패는 본문에 표시하고 미해결에 모은다', { skip }, () => {
  const 깨진 = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8')
    .replace('>계시록 2:4<', '>없는책 2:4<');
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const 출처 = { 기사URL: 'u', 주페이지URL: 'v', 조회날짜: '2026-07-30' };
  const { 마크다운, 통계 } = buildPrepSheet(parseArticle(깨진), 도구, 출처);
  assert.equal(통계.인용수, 10);
  assert.equal(통계.해석수, 9);
  assert.equal(통계.미해결.length, 1);
  assert.equal(통계.미해결[0].라벨, '없는책 2:4');
  assert.match(마크다운, /⚠/);
  assert.match(마크다운, /## 미해결/);
});
```

- [ ] **Step 2: 시험이 실패하는 것을 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './prep-sheet.mjs'`

- [ ] **Step 3: 구현한다**

`src/prep-sheet.mjs` 를 만든다.

```javascript
// 파싱한 기사 구조와 코어 본문으로 파수대 예습지 마크다운을 만드는 모듈
import { resolveAll } from './citation-parse.mjs';
import { formatAddress } from './verse-address.mjs';

const 본문없음 = '(본문 없음)';

// 난외 참조 목록은 길어질 수 있어 개수와 주소 몇 개만 보여준다.
// 궁금한 것은 `성구 <주소>` 로 따로 본다.
const 역참조표시 = 4;

function 절블록(도구, 주소들) {
  const 줄 = [];
  for (const a of 주소들) {
    const 본문 = 도구.text.verse(a.book, a.chapter, a.verse) ?? 본문없음;
    줄.push(`  > ${본문}`);
  }
  return 줄;
}

function 역참조요약(도구, 주소들) {
  const 모음 = new Set();
  for (const a of 주소들) {
    for (const src of 도구.refs.reverse.get(a.verseId) ?? []) 모음.add(src);
  }
  if (!모음.size) return null;
  const 목록 = [...모음].sort((x, y) => x - y);
  const 보일것 = 목록.slice(0, 역참조표시).map(id => formatAddress(도구.index, id));
  const 꼬리 = 목록.length > 역참조표시 ? ` 외 ${목록.length - 역참조표시}건` : '';
  return `  이곳을 가리키는 참조 ${목록.length}건 — ${보일것.join(', ')}${꼬리}`;
}

export function buildPrepSheet(기사, 도구, 출처) {
  const 줄 = [];
  const 미해결 = [];
  let 인용수 = 0;
  let 해석수 = 0;

  줄.push(`# 파수대 연구 — ${기사.주라벨}`);
  줄.push(`## ${기사.제목}`);
  줄.push('');
  if (기사.노래) 줄.push(기사.노래);
  줄.push(`기사 ${출처.기사URL}`);
  줄.push('');
  if (기사.요점) {
    줄.push(`**요점** ${기사.요점}`);
    줄.push('');
  }

  if (기사.주제성구) {
    const 해석 = resolveAll(도구.index, [{ ...기사.주제성구, 낭독: false }])[0].해석;
    인용수++;
    줄.push(`**주제 성구** ${기사.주제성구.라벨}`);
    if (해석.성공) {
      해석수++;
      줄.push(...절블록(도구, 해석.주소들));
    } else {
      미해결.push({ 라벨: 기사.주제성구.라벨, 사유: 해석.사유 });
      줄.push(`  > ⚠ 해석 실패 — ${해석.사유}`);
    }
    줄.push('');
  }

  줄.push('---');
  줄.push('');

  for (const g of 기사.문단그룹) {
    const 제목 = g.문단번호.length
      ? `### ${g.문단번호.length > 1 ? `${g.문단번호[0]}-${g.문단번호[g.문단번호.length - 1]}` : g.문단번호[0]}문단`
      : '### 문단';
    줄.push(제목);
    줄.push('');
    줄.push(`**질문** ${g.질문}`);
    줄.push('');
    줄.push(`문단 읽기 → ${출처.기사URL}`);
    줄.push('');

    const 해석들 = resolveAll(도구.index, g.인용);
    if (해석들.length) {
      줄.push('**인용 성구**');
      줄.push('');
      for (const c of 해석들) {
        인용수++;
        if (!c.해석.성공) {
          미해결.push({ 라벨: c.라벨, 사유: c.해석.사유 });
          줄.push(`- **${c.라벨}** ⚠ 해석 실패 — ${c.해석.사유}`);
          줄.push('');
          continue;
        }
        해석수++;
        const 이름 = formatAddress(도구.index, c.해석.주소들[0].verseId);
        const 끝 = c.해석.주소들[c.해석.주소들.length - 1];
        const 범위 = c.해석.주소들.length > 1 ? `${이름}-${끝.verse}` : 이름;
        줄.push(`- **${범위}**${c.낭독 ? ' (낭독)' : ''}`);
        줄.push(...절블록(도구, c.해석.주소들));
        const 역 = 역참조요약(도구, c.해석.주소들);
        if (역) {
          줄.push('');
          줄.push(역);
        }
        줄.push('');
      }
    }

    줄.push('**내 답**');
    줄.push('');
    줄.push('');
    줄.push('---');
    줄.push('');
  }

  줄.push('## 미해결');
  줄.push('');
  if (미해결.length) {
    for (const m of 미해결) 줄.push(`- ⚠ \`${m.라벨}\` — ${m.사유}`);
  } else {
    줄.push('없다. 인용 성구가 전부 해석됐다.');
  }
  줄.push('');
  줄.push('## 출처');
  줄.push('');
  줄.push(`- 기사 ${출처.기사URL} — ${출처.조회날짜} 조회`);
  줄.push(`- 주간 집회 ${출처.주페이지URL} — ${출처.조회날짜} 조회`);
  줄.push('');

  return { 마크다운: 줄.join('\n'), 통계: { 인용수, 해석수, 미해결 } };
}
```

- [ ] **Step 4: 시험이 통과하는 것을 확인한다**

Run: `npm test`
Expected: PASS

`통계.인용수` 가 8 이 아니면 픽스처의 인용 개수를 세어 시험의 기대값을 맞춘다. 픽스처에는 주제 성구 1 + 질문 안 1 + 문단 안 6 = 8 개가 있다.

- [ ] **Step 5: 커밋한다**

```bash
git add src/prep-sheet.mjs src/prep-sheet.test.mjs
git commit -m "예습지 마크다운 생성 모듈 추가 — 성구 본문은 코어에서만 온다"
```

---

## Task 5: 조립 스크립트와 명령어 등록

**Files:**
- Create: `scripts/prepare-meeting.mjs`
- Modify: `package.json` (scripts 절)
- Modify: `README.md` (성구 조회 절 다음에 추가)

**Interfaces:**
- Consumes: Task 1-4 의 모든 export, 그리고 `src/bible-text.mjs` 의 `createTextReader`, `src/refs-lookup.mjs` 의 `loadRefs`, `src/verse-address.mjs` 의 `loadIndex`
- Produces: `activities/meetings/<주 시작일>/파수대-예습.md`

- [ ] **Step 1: 스크립트를 쓴다**

`scripts/prepare-meeting.mjs` 를 만든다.

```javascript
// 그 주 파수대 연구 기사를 받아 예습지를 만들어 activities 에 쓰는 조립 스크립트
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex } from '../src/verse-address.mjs';
import { createTextReader } from '../src/bible-text.mjs';
import { loadRefs } from '../src/refs-lookup.mjs';
import { isoWeek, weekStart, weekPageUrl, articleUrl, parseWeekPage } from '../src/wol-week.mjs';
import { parseArticle } from '../src/wol-article.mjs';
import { buildPrepSheet } from '../src/prep-sheet.mjs';

const USAGE = [
  '사용법',
  '  npm run 집회준비                     오늘이 속한 주',
  '  npm run 집회준비 -- 2026-08-02       날짜로 다른 주를 지정',
  '  npm run 집회준비 -- --docid 2026403  기사를 직접 지정 (wol 구조가 바뀌었을 때)',
].join('\n');

const 캐시디렉토리 = '.cache/wol';

async function 받기(url, 캐시이름) {
  const 경로 = join(캐시디렉토리, 캐시이름);
  if (existsSync(경로)) return readFileSync(경로, 'utf8');
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${url} 를 받지 못했다 — HTTP ${r.status}`);
  const html = await r.text();
  mkdirSync(캐시디렉토리, { recursive: true });
  writeFileSync(경로, html, 'utf8');
  return html;
}

const 인자 = process.argv.slice(2);
if (인자.includes('--help') || 인자.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

const docid지정 = 인자.includes('--docid') ? 인자[인자.indexOf('--docid') + 1] : null;
const 날짜인자 = 인자.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

// 이 기기의 달력 날짜를 그대로 UTC 자정으로 옮긴다.
// new Date() 를 그대로 쓰면 한국 시간 오전 9시 이전에 UTC 로는 전날이 되어 주가 하나 밀린다.
function 오늘의날짜() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

const 기준일 = 날짜인자 ? new Date(`${날짜인자}T00:00:00Z`) : 오늘의날짜();
if (Number.isNaN(기준일.getTime())) {
  console.error(`날짜를 해석할 수 없다: ${날짜인자}\n\n${USAGE}`);
  process.exit(1);
}

function 읽거나종료(무엇, 읽기) {
  try {
    return 읽기();
  } catch (e) {
    console.error(`${무엇} 를 읽을 수 없다: ${e.message}`);
    console.error('README.md 의 파이프라인 순서대로 산출물을 먼저 만들어야 한다.');
    process.exit(1);
  }
}

const index = 읽거나종료('성경 색인', () => loadIndex());
const 도구 = {
  index,
  text: createTextReader(index),
  refs: 읽거나종료('상호 참조', () => loadRefs(index)),
};

const { year, week } = isoWeek(기준일);
const 주URL = weekPageUrl(year, week);

let docId = docid지정;
if (!docId) {
  try {
    const 주html = await 받기(주URL, `week-${year}-${week}.html`);
    docId = parseWeekPage(주html).파수대docId;
  } catch (e) {
    console.error(`주간 집회 페이지에서 기사를 찾지 못했다: ${e.message}`);
    console.error(`${주URL} 을 열어 docId 를 확인한 뒤 --docid 로 지정할 수 있다.`);
    process.exit(1);
  }
}

const 기사URL = articleUrl(docId);
let 기사;
try {
  기사 = parseArticle(await 받기(기사URL, `doc-${docId}.html`));
} catch (e) {
  console.error(`기사를 해석하지 못했다: ${e.message}`);
  console.error(`${기사URL} 의 구조가 바뀌었을 수 있다. 예습지를 쓰지 않고 멈춘다.`);
  process.exit(1);
}

const 조회날짜 = 오늘의날짜().toISOString().slice(0, 10);
const { 마크다운, 통계 } = buildPrepSheet(기사, 도구, { 기사URL, 주페이지URL: 주URL, 조회날짜 });

const 폴더 = join('activities', 'meetings', weekStart(기준일));
mkdirSync(폴더, { recursive: true });
const 산출물 = join(폴더, '파수대-예습.md');
writeFileSync(산출물, 마크다운, 'utf8');

console.log(`\n${기사.주라벨}  ${기사.제목}`);
console.log(`예습지 → ${산출물}`);
console.log(`인용 ${통계.인용수}건 중 ${통계.해석수}건 해석, ${통계.미해결.length}건 미해결`);
for (const m of 통계.미해결) console.log(`  ⚠ ${m.라벨} — ${m.사유}`);
console.log();
```

- [ ] **Step 2: package.json 에 명령어를 등록한다**

`package.json` 의 `scripts` 에 아래 두 줄을 `"성구"` 앞에 넣는다.

```json
    "집회준비": "node --no-warnings scripts/prepare-meeting.mjs",
    "meeting": "node --no-warnings scripts/prepare-meeting.mjs",
```

- [ ] **Step 3: 도움말이 도는지 확인한다**

Run: `npm run 집회준비 -- --help`
Expected: 사용법 세 줄이 출력되고 종료 코드 0

- [ ] **Step 4: 실제로 이번 주 예습지를 만든다**

Run: `npm run 집회준비`
Expected:
- `activities/meetings/2026-07-27/파수대-예습.md` 가 생긴다
- 마지막 줄이 `인용 39건 중 39건 해석, 0건 미해결` 이다

미해결이 0 이 아니면 출력된 라벨을 보고 `src/citation-parse.mjs` 의 `별칭` 에 한 줄을 더한 뒤, `src/citation-parse.test.mjs` 의 라벨 목록에도 그 라벨을 넣고 다시 돌린다.

- [ ] **Step 5: 예습지의 성구 본문이 조회 도구와 같은지 대조한다**

Run: `npm run 성구 -- "빌립보서 3:16"`
Expected: 출력된 본문 문자열이 예습지 안의 같은 성구 줄과 글자 단위로 같다

- [ ] **Step 6: 전체 시험을 돌린다**

Run: `npm test`
Expected: PASS — 기존 67개에 새 시험이 더해져 전부 통과

- [ ] **Step 7: README 에 사용법을 더한다**

`README.md` 의 "성구 조회" 절 바로 뒤에 아래를 넣는다.

```markdown
## 집회 준비

그 주 파수대 연구 기사의 질문과 인용 성구를 모아 예습지를 만든다. 기사 본문은
담지 않는다. 인용 성구만 `core/bible/text/` 의 본문으로 펼친다.

```bash
npm run 집회준비                     # 오늘이 속한 주
npm run 집회준비 -- 2026-08-02       # 날짜로 다른 주를 지정
npm run 집회준비 -- --docid 2026403  # 기사를 직접 지정
```

산출물은 `activities/meetings/<주 시작일>/파수대-예습.md` 다. 받은 HTML 은
`.cache/wol/` 에 캐시하므로 다시 돌려도 wol 을 또 부르지 않는다.

해석하지 못한 성구 라벨은 예습지에 `⚠` 로 남고 문서 끝 "미해결" 절에 모인다.
스크립트도 마지막에 개수를 보고한다. 조용히 건너뛰지 않는다.
```

- [ ] **Step 8: 커밋한다**

```bash
git add scripts/prepare-meeting.mjs package.json README.md
git commit -m "집회준비 명령어 추가 — 파수대 예습지를 자동으로 만든다"
```

---

## Task 6: `/집회준비` 스킬

**Files:**
- Create: `.claude/skills/집회준비/SKILL.md`

**Interfaces:**
- Consumes: Task 5 의 `npm run 집회준비` 와 그 산출물 경로
- Produces: 없음 (Claude 가 읽는 문서)

- [ ] **Step 1: 스킬 문서를 쓴다**

`.claude/skills/집회준비/SKILL.md` 를 만든다.

```markdown
---
name: 집회준비
description: 그 주 파수대 연구 기사를 예습한다. 예습지를 만들고, 함께 보며 답을 잡고, 끝에 코어로의 승급을 제안한다.
---

# 집회준비

## 순서

1. **예습지를 만든다.** `npm run 집회준비` 를 돌린다. 다른 주를 원하면
   `npm run 집회준비 -- 2026-08-02` 처럼 날짜를 준다.
2. **산출물을 읽는다.** `activities/meetings/<주 시작일>/파수대-예습.md` 다.
   스크립트가 마지막에 알려 준 경로를 쓴다.
3. **미해결을 먼저 확인한다.** 문서 끝의 "미해결" 절이 비어 있지 않으면 형제님께
   알린다. 해석하지 못한 성구가 있다는 뜻이므로 조용히 넘어가지 않는다.
4. **함께 본다.** 문단그룹을 순서대로 짚으며 질문에 답을 잡는다. 막히는 곳은
   인용 성구와 그 역참조를 함께 놓고 본다.
5. **승급을 제안한다.** 아래 규칙을 따른다.

## 승급 규칙

설계 문서 §5.2 다. 활동에서 얻은 것 중 다음에 해당하면 코어로 올릴지 **반드시 묻는다**.

- 특정 절에 대한 새로운 이해 → `core/verses/<권>-<장>-<절>.md`
- 여러 성구에 걸친 개념 정리 → `core/topics/<주제>.md`
- 히브리어·그리스어 단어의 의미 → `core/words/<단어>.md`

이미 노트가 있으면 새로 만들지 않고 덧붙이며 날짜를 남긴다. 노트끼리는 `[[링크]]` 로
잇는다. 승급한 것은 `profile/progress.md` 의 "승급 기록" 에도 한 줄 남긴다.

## 지켜야 할 것

- **성구 본문을 직접 옮겨 적지 않는다.** 예습지에 이미 코어에서 온 본문이 들어 있다.
  더 필요하면 `src/bible-text.mjs` 를 import 해서 읽는다. 기억으로 인용하지 않는다.
- **`성구.cmd` 를 부르지 않는다.** 파일 이름이 한국어라 프로그램이 부르면 깨진다.
  `src/verse-address.mjs` · `src/bible-text.mjs` · `src/refs-lookup.mjs` 를 직접 쓴다.
- **교리 설명에는 출판물 근거를 단다.** 근거를 찾지 못하면 "출판물 근거 미확인 —
  내 정리임" 이라고 명시한다.
- **독자적인 새 해석을 만들지 않는다.** 여호와의 증인의 이해를 기준으로 삼는다.
- **조회한 출판물은 URL 과 조회 날짜를 남긴다.**
- **한국어 문장은 마침표로 끝낸다.** 문장 끝에 콜론을 쓰지 않는다.
- **wol 접근은 스크립트 안에서 한다.** WebFetch 도구는 wol 에서 타임아웃 난다.
```

- [ ] **Step 2: 스킬이 목록에 뜨는지 확인한다**

`.claude/skills/집회준비/SKILL.md` 가 있고 frontmatter 의 `name` 이 `집회준비` 인지 눈으로 확인한다. 새 세션에서 `/집회준비` 로 부를 수 있다.

- [ ] **Step 3: 체크리스트를 갱신한다**

`checklist.md` 의 "이후 단계" 에서 2단계 줄을 완료로 바꾸고, 2단계 절을 더한다.

```markdown
## 2단계 — `/집회준비` (파수대 연구)

- [x] Task 1 성구 라벨 해석
- [x] Task 2 기사 파서와 합성 픽스처
- [x] Task 3 ISO 주 계산과 주간 페이지 파서
- [x] Task 4 예습지 생성
- [x] Task 5 조립 스크립트와 명령어 등록
- [x] Task 6 `/집회준비` 스킬

**2단계 완료.** 인용 39건 중 39건이 해석된다.
```

- [ ] **Step 4: 컨텍스트 노트에 결정을 적는다**

`context-notes.md` 맨 위에 아래를 더한다.

```markdown
## 2026-07-30 — wol 성구 라벨은 권 이름을 생략할 수 있다

`시 101:6, 7; 119:63` 의 `119:63` 과 `고린도 전서 9:26, 27; 10:31` 의 `10:31` 은
링크 본문에 권 이름이 없다. 앞 참조에서 이어받아야 하는데, 이어받는 범위를 문서
전체로 잡으면 엉뚱한 권을 물어 온다. `data-bid` 가 `{그룹}-{그룹내순번}` 형식이고
같은 괄호 안의 참조가 같은 그룹 번호를 가지므로, **이어받기는 같은 bid 그룹 안에서만**
한다. 그룹의 첫 항목에 권 이름이 없으면 해석 실패로 처리한다.

권 이름 해소는 완전 일치 → 별칭표 → 접두 유일 일치 순이다. 후보가 둘 이상이면
조용히 고르지 않고 실패로 본다. 별칭표는 손으로 66개를 채우지 않고 규칙으로 안
풀리는 것만 넣는다. 새 약칭은 예습지의 "미해결" 로 드러나므로 그때 한 줄 더한다.
```

- [ ] **Step 5: 전체 시험과 검증을 돌린다**

Run: `npm test && npm run verify && npm run verify:refs`
Expected: 전부 PASS

- [ ] **Step 6: 커밋한다**

```bash
git add .claude/skills/집회준비/SKILL.md checklist.md context-notes.md
git commit -m "집회준비 스킬 추가와 2단계 마무리 정리"
```

---

## 완료 기준

- `npm test` 가 통과한다
- `npm run 집회준비` 가 이번 주 예습지를 만든다
- 예습지의 성구 본문이 `npm run 성구` 출력과 글자 단위로 같다
- 인용 39건 중 39건이 해석된다
- 예습지에 기사 문단 본문이 들어 있지 않다
- 형제님이 예습지를 실제로 보고 쓸 만하다고 확인한다
