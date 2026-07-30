# 성경 코어 구축 구현 계획 (1단계)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 신세계역 성경 66권 본문·상호참조·인덱스를 로컬 파일로 구축하고, 무결성을 기계로 검증한다.

**Architecture:** 자료를 두 곳에서 가져와 교차 검증한다. `nwtsty_KO.jwpub` 안의 SQLite DB에서 **구조**(권/장/절 인덱스, 상호참조 65,578건)를 얻고, wol.jw.org에서 **본문**을 얻는다. 두 자료원은 동일한 절 ID 공간(0~31193)을 공유하므로 서로를 검증할 수 있다. 산출물은 전부 평문 마크다운·TSV·JSON이며 git으로 관리한다.

**Tech Stack:** Node.js 24 (ESM), 외부 의존성 없음. `node:sqlite`, `node:zlib`, `node:test`, 내장 `fetch` 만 사용한다.

## Global Constraints

- Node 24 이상. 모든 소스는 ESM `.mjs` 이며 `package.json` 에 `"type": "module"` 을 둔다.
- **외부 npm 의존성을 추가하지 않는다.** 필요한 기능은 Node 내장 모듈로 해결한다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- **새로 만드는 모든 소스 파일의 첫 줄은 그 파일의 역할을 설명하는 한국어 한 줄 주석이다.**
- 한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.
- 커밋 메시지는 한국어로 쓰고, 하나의 논리적 변경마다 커밋한다.
- 원본 `C:\Users\do921\Downloads\nwtsty_KO.jwpub` 는 절대 수정하지 않는다. 읽기 전용으로만 연다.
- 대용량 중간 산출물(`.cache/`)은 git에 넣지 않는다. 커밋하는 것은 파생된 텍스트 자료뿐이다.

## 확정된 사실 (스파이크로 검증 완료)

이 계획은 아래 사실 위에 서 있다. 전부 실측으로 확인했다.

| 항목 | 값 |
|---|---|
| jwpub 구조 | ZIP → `manifest.json` + `contents`(ZIP) → `nwtsty_KO.db` (SQLite, 56MB) |
| DB 내용 암호화 | `BibleVerse.Content` 등 BLOB은 AES 암호화됨. **키 미확보이므로 사용하지 않는다** |
| DB 평문 사용 가능 | `BibleBook`(66), `BibleChapter`(1189), `BibleVerse.Label`, `BibleCitation`(87,283) |
| 절 ID 공간 | 0 ~ 31193, 총 31,194절. 창세기 1:1 = 0, 요한 계시록 22:21 = 31193 |
| 절-대-절 상호참조 | `BibleCitation WHERE BibleVerseId IS NOT NULL` = 65,578행 |
| wol 접근 | 로컬 Node `fetch` 로 HTTP 200, 약 130ms, 315KB (WebFetch 도구로는 타임아웃되므로 반드시 Node에서 실행) |
| wol URL | `https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/{권번호}/{장번호}` |
| wol 절 마크업 | `<span id="v{권}-{장}-{절}-1" class="v">` 안에 `<a class="vl vx vp study">번호 </a>` + 본문 + `<a class="b">+</a>` |
| 교차 검증 | 마태 24장 → DB 51절, wol `class="v"` 51개. 일치 |

## 계획 결함 정정 (2026-07-30, Task 5 수행 중 발견)

**이 계획의 최초 판은 "각 장의 절 번호는 1부터 N까지 이어진다" 고 가정했다. 이 가정은 틀렸다.**
Task 5 의 `verify-bible` 이 127건의 불일치를 보고해 드러났고, 원인은 정확히 두 가지다.

| 예외 | 규모 | 내용 |
|---|---|---|
| 시편 표제 | 116편 | 신세계역은 표제("다윗의 시가. 아들 압살롬을 피해 도망할 때")를 절 번호 없이 1절 위에 둔다. wol 은 이를 **0절**로 매긴다 |
| 요한복음 8:1-11 | 1개 장 | 신세계역은 간음한 여자 대목을 본문에서 빼고 각주로 처리한다. 8장은 **12절에서 시작**한다 |

116 + 11 = 127 로 정확히 일치하므로, **이 둘 외에 다른 이상은 없다.** 장 안에서 절 번호는 연속이다.

수집된 본문 자체는 정확하다. 결함은 `core/bible/index.json` 과 `src/verse-address.mjs` 에만 있다.
영향은 심각하다. `toVerseId(19, 3, 8)` 이 시편 3:8 이 아니라 3:7 을 가리킨다.

**정정된 사실**

| 항목 | 값 |
|---|---|
| 장의 절 번호 범위 | `1..N` 이 아니다. 장마다 시작 번호가 다를 수 있다 |
| 시작 번호 도출 규칙 | **각 장 마지막 행의 `Label` 은 항상 진짜 절 번호다.** 장 번호 마커는 첫 행에만 붙는다. 따라서 `시작번호 = 마지막행Label - (행수 - 1)` |
| 검증 사례 | 창세기 1장 → 1, 시편 3편 → 0, 요한복음 8장 → 12, 마태복음 17장 → 1 |
| 시편 표제 처리 | 사용자 결정으로 **0절로 보존**한다. 본문 파일에 `3:0` 형태로 남는다 |

Task 7 이 이 결함을 정정한다. **Task 6 은 Task 7 이 끝난 뒤에 착수한다** — 상호 참조 65,578건을
사람이 읽는 성구로 바꿀 때 이 계산을 쓰기 때문이다.

---

### Task 1: 프로젝트 골조와 ZIP 리더

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `CLAUDE.md`
- Create: `checklist.md`
- Create: `context-notes.md`
- Create: `core/verses/.gitkeep`, `core/topics/.gitkeep`, `core/words/.gitkeep`
- Create: `activities/meetings/.gitkeep`, `activities/talks/.gitkeep`, `activities/ministry/.gitkeep`, `activities/reading/.gitkeep`
- Create: `profile/me.md`, `profile/progress.md`
- Create: `src/zip.mjs`
- Test: `src/zip.test.mjs`
- Create: `scripts/unpack-jwpub.mjs`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `readEntries(zipPath: string) => Array<{name: string, method: number, compSize: number, rawSize: number, localOff: number}>`
  - `extractEntry(zipPath: string, entry: object) => Buffer`
  - `scripts/unpack-jwpub.mjs` 실행 결과로 `.cache/nwtsty_KO.db` 생성

- [ ] **Step 1: `package.json` 을 만든다**

```json
{
  "name": "jw-assistant",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "scripts": {
    "test": "node --test --no-warnings",
    "unpack": "node --no-warnings scripts/unpack-jwpub.mjs",
    "extract:index": "node --no-warnings scripts/extract-index.mjs",
    "extract:refs": "node --no-warnings scripts/extract-refs.mjs",
    "fetch:bible": "node --no-warnings scripts/fetch-bible.mjs",
    "verify": "node --no-warnings scripts/verify-bible.mjs"
  }
}
```

- [ ] **Step 2: `.gitignore` 를 만든다**

```gitignore
node_modules/
.cache/
```

- [ ] **Step 3: `CLAUDE.md` 를 만든다**

```markdown
# jw-assistant

김동언 형제(35세, 광주양림회중)의 개인 성경 연구를 돕는 도구다.
설계 문서는 `docs/superpowers/specs/2026-07-29-jw-assistant-design.md` 에 있다.

## 정확성 규칙 — 예외 없음

1. **성구 인용은 반드시 `core/bible/text/` 에서 실제로 읽은 문자열만 쓴다.**
   기억에 의존한 인용을 금지한다. 인용 전에 반드시 파일을 읽는다.
2. **교리적 설명에는 출판물 근거를 단다.** 근거를 찾지 못하면
   "출판물 근거 미확인 — 내 정리임" 이라고 반드시 명시한다.
3. **여호와의 증인의 이해를 기준으로 삼되, 독자적인 새 해석을 만들어내지 않는다.**
4. 조회한 출판물은 URL과 조회 날짜를 함께 남긴다.
5. 한국어 문장은 마침표로 끝낸다. 문장 끝에 콜론을 쓰지 않는다.

## 자료 구조

- `core/` 는 영구 자산이다. 계속 다듬어진다.
- `activities/` 는 시점 산출물이다. 날짜가 붙는다.
- 활동이 끝나면 새로 이해한 것을 `core/` 로 승격할지 반드시 묻는다.

## 기술 규칙

- Node 24 ESM. 외부 npm 의존성을 추가하지 않는다.
- 폴더 이름은 영문, 파일 이름과 내용은 한국어로 쓴다.
- 새 소스 파일의 첫 줄은 역할을 설명하는 한국어 한 줄 주석이다.
- 원본 jwpub 파일은 읽기 전용으로만 연다.
```

- [ ] **Step 3b: 나머지 골조와 진행 문서를 만든다**

빈 디렉토리는 git이 추적하지 않으므로 `.gitkeep` 을 둔다.

```bash
mkdir -p core/verses core/topics core/words \
         activities/meetings activities/talks activities/ministry activities/reading \
         profile tests/fixtures
touch core/verses/.gitkeep core/topics/.gitkeep core/words/.gitkeep \
      activities/meetings/.gitkeep activities/talks/.gitkeep \
      activities/ministry/.gitkeep activities/reading/.gitkeep
```

`profile/me.md`

```markdown
# 김동언

- 나이 35세
- 광주양림회중과 연합

## 현재 맡은 과제

아직 기록된 것이 없다. 집회 과제나 임명이 생기면 여기에 적는다.

## 관심 주제

아직 기록된 것이 없다. 연구하다 반복해서 돌아오는 주제를 여기에 모은다.
```

`profile/progress.md`

```markdown
# 진도와 목표

## 통독 진도

- 마지막으로 읽은 곳: 아직 시작하지 않음
- 오늘까지 읽은 장 수: 0

## 영적 목표

아직 기록된 것이 없다.

## 승격 기록

활동에서 얻은 통찰을 `core/` 로 올릴 때마다 날짜와 함께 여기에 남긴다.
```

`checklist.md`

```markdown
# 진행 체크리스트

계획 문서는 `docs/superpowers/plans/2026-07-29-bible-core.md` 에 있다.

## 1단계 — 성경 코어

- [ ] Task 1 골조와 ZIP 리더
- [ ] Task 2 성경 인덱스 추출
- [ ] Task 3 성구 주소 변환 모듈
- [ ] Task 4 wol 장 페이지 파서
- [ ] Task 5 전권 본문 수집과 무결성 검증
- [ ] Task 6 상호 참조 추출

## 이후 단계

- [ ] 2단계 `/집회준비` 워크플로
- [ ] 3단계 `/주제연구` 와 성구·주제 노트 체계, 연구 노트·각주 수집
- [ ] 4단계 `/통독` · `/봉사준비` · `/공개강연`
```

`context-notes.md`

```markdown
# 컨텍스트 노트

작업 중 내린 결정과 그 이유를 계속 덧붙인다. 최신 항목을 위에 둔다.

## 2026-07-29 — 성경 본문을 wol 에서 가져오기로 함

`nwtsty_KO.jwpub` 안의 `BibleVerse.Content` 는 AES 암호화되어 있고 키를 확보하지 못했다.
씨앗 후보 125개와 복호화 변형 5종을 조합해 625회를 시도했으나 전부 실패했고,
공개된 jwpub 문서에도 알고리즘이 없었다.

그래서 자료원을 둘로 나눴다. **구조는 DB, 본문은 wol** 이다.
DB 의 `BibleBook` · `BibleChapter` · `BibleCitation` 은 평문이라 그대로 쓸 수 있고,
wol 의 절 앵커(`v40-24-13-1`)와 DB 의 절 ID 가 같은 공간을 쓰기 때문에
두 자료원이 서로를 검증한다. 마태 24장이 양쪽 모두 51절로 확인됐다.

## 2026-07-29 — wol 은 로컬 Node 로만 접근한다

Claude 의 WebFetch 도구로는 wol.jw.org 이 두 번 다 60초 타임아웃이었다.
로컬 Node 프로세스의 `fetch` 는 HTTP 200 을 130ms 에 받는다.
따라서 wol 접근은 반드시 스크립트 안에서 한다.

## 2026-07-29 — 절 개수 기준선을 DB 에서 가져옴

통용되는 31,102절은 신세계역과 맞지 않는다. 신세계역은 후대 사본에만 있는 절을
본문에서 빼고 각주로 처리하기 때문이다. DB 기준 실제 값은 66권 1,189장 **31,194절** 이다.
검증은 이 값을 기준선으로 삼는다.
```

- [ ] **Step 4: 실패하는 테스트를 쓴다**

`src/zip.test.mjs`

```js
// ZIP 리더가 실제 jwpub 파일을 올바로 읽는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readEntries, extractEntry } from './zip.mjs';

const JWPUB = join(homedir(), 'Downloads', 'nwtsty_KO.jwpub');

test('jwpub 최상위에는 manifest.json 과 contents 두 항목이 있다', { skip: !existsSync(JWPUB) }, () => {
  const entries = readEntries(JWPUB);
  const names = entries.map(e => e.name).sort();
  assert.deepEqual(names, ['contents', 'manifest.json']);
});

test('manifest.json 을 꺼내면 nwtsty 한국어 연구용 성경이다', { skip: !existsSync(JWPUB) }, () => {
  const entries = readEntries(JWPUB);
  const manifest = JSON.parse(
    extractEntry(JWPUB, entries.find(e => e.name === 'manifest.json')).toString('utf8')
  );
  assert.equal(manifest.publication.uniqueEnglishSymbol, 'nwtsty');
  assert.equal(manifest.publication.language, 129);
  assert.equal(manifest.publication.fileName, 'nwtsty_KO.db');
});
```

- [ ] **Step 5: 테스트를 돌려 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './zip.mjs'`

- [ ] **Step 6: `src/zip.mjs` 를 구현한다**

```js
// ZIP 아카이브의 항목 목록을 읽고 개별 항목을 꺼내는 최소 구현
import { openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

export function readEntries(zipPath) {
  const fd = openSync(zipPath, 'r');
  try {
    const size = fstatSync(fd).size;
    const tailLen = Math.min(size, 22 + 65535);
    const tail = Buffer.alloc(tailLen);
    readSync(fd, tail, 0, tailLen, size - tailLen);

    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('EOCD 를 찾을 수 없음 — ZIP 파일이 아니다');

    const count = tail.readUInt16LE(eocd + 10);
    const cenSize = tail.readUInt32LE(eocd + 12);
    const cenOff = tail.readUInt32LE(eocd + 16);

    const cen = Buffer.alloc(cenSize);
    readSync(fd, cen, 0, cenSize, cenOff);

    const entries = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (cen.readUInt32LE(p) !== CEN_SIG) throw new Error('중앙 디렉터리 시그니처가 맞지 않는다');
      const method = cen.readUInt16LE(p + 10);
      const compSize = cen.readUInt32LE(p + 20);
      const rawSize = cen.readUInt32LE(p + 24);
      const nameLen = cen.readUInt16LE(p + 28);
      const extraLen = cen.readUInt16LE(p + 30);
      const cmtLen = cen.readUInt16LE(p + 32);
      const localOff = cen.readUInt32LE(p + 42);
      const name = cen.subarray(p + 46, p + 46 + nameLen).toString('utf8');
      entries.push({ name, method, compSize, rawSize, localOff });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return entries;
  } finally {
    closeSync(fd);
  }
}

export function extractEntry(zipPath, entry) {
  const fd = openSync(zipPath, 'r');
  try {
    const lh = Buffer.alloc(30);
    readSync(fd, lh, 0, 30, entry.localOff);
    const nameLen = lh.readUInt16LE(26);
    const extraLen = lh.readUInt16LE(28);
    const dataOff = entry.localOff + 30 + nameLen + extraLen;

    const comp = Buffer.alloc(entry.compSize);
    readSync(fd, comp, 0, entry.compSize, dataOff);

    if (entry.method === 0) return comp;
    if (entry.method === 8) return inflateRawSync(comp);
    throw new Error(`지원하지 않는 압축 방식이다: ${entry.method}`);
  } finally {
    closeSync(fd);
  }
}
```

- [ ] **Step 7: 테스트가 통과하는지 확인한다**

Run: `npm test`
Expected: PASS — 2개 테스트 통과

- [ ] **Step 8: `scripts/unpack-jwpub.mjs` 를 만든다**

```js
// jwpub 원본에서 SQLite DB 를 꺼내 .cache 에 놓는 스크립트
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readEntries, extractEntry } from '../src/zip.mjs';

const JWPUB = process.argv[2] ?? join(homedir(), 'Downloads', 'nwtsty_KO.jwpub');
const CACHE = '.cache';
const DB_OUT = join(CACHE, 'nwtsty_KO.db');

if (!existsSync(JWPUB)) {
  console.error(`원본을 찾을 수 없다: ${JWPUB}`);
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });

const outer = readEntries(JWPUB);
const manifest = JSON.parse(
  extractEntry(JWPUB, outer.find(e => e.name === 'manifest.json')).toString('utf8')
);
const dbName = manifest.publication.fileName;
console.log(`출판물: ${manifest.publication.title} (${manifest.publication.year})`);

const contentsZip = join(CACHE, 'contents.zip');
writeFileSync(contentsZip, extractEntry(JWPUB, outer.find(e => e.name === 'contents')));

const inner = readEntries(contentsZip);
const dbEntry = inner.find(e => e.name === dbName);
if (!dbEntry) throw new Error(`contents 안에서 ${dbName} 을 찾을 수 없다`);

writeFileSync(DB_OUT, extractEntry(contentsZip, dbEntry));
console.log(`생성: ${DB_OUT}`);
```

- [ ] **Step 9: 스크립트를 실행해 DB 가 나오는지 확인한다**

Run: `npm run unpack`
Expected: `출판물: 신세계역 성경 (연구용) (2024)` 와 `생성: .cache\nwtsty_KO.db` 가 출력되고, `.cache/nwtsty_KO.db` 가 약 56MB로 생성된다

- [ ] **Step 10: 커밋한다**

```bash
git add package.json .gitignore CLAUDE.md checklist.md context-notes.md \
        core/ activities/ profile/ src/zip.mjs src/zip.test.mjs scripts/unpack-jwpub.mjs
git commit -m "골조와 ZIP 리더 추가 — jwpub 에서 SQLite DB 추출"
```

---

### Task 2: 성경 인덱스 추출

**Files:**
- Create: `scripts/extract-index.mjs`
- Test: `scripts/extract-index.test.mjs`
- 산출물: `core/bible/index.json`

**Interfaces:**
- Consumes: `.cache/nwtsty_KO.db` (Task 1)
- Produces: `core/bible/index.json`
  ```
  {
    source: string, generatedAt: string,
    totals: { books: 66, chapters: 1189, verses: 31194 },
    books: Array<{
      num: number, title: string, slug: string,
      firstVerseId: number, lastVerseId: number,
      chapters: Array<{ num: number, firstVerseId: number, lastVerseId: number, verses: number }>
    }>
  }
  ```
  `slug` 는 `01-창세기` 처럼 2자리 번호와 공백을 제거한 권 이름을 이은 값이다.

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scripts/extract-index.test.mjs`

```js
// 추출된 성경 인덱스가 원본 DB 와 일치하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const PATH = 'core/bible/index.json';
const skip = !existsSync(PATH);
const idx = skip ? null : JSON.parse(readFileSync(PATH, 'utf8'));

test('총계는 66권 1189장 31194절이다', { skip }, () => {
  assert.deepEqual(idx.totals, { books: 66, chapters: 1189, verses: 31194 });
});

test('권 배열의 길이와 장 합계가 총계와 맞는다', { skip }, () => {
  assert.equal(idx.books.length, 66);
  assert.equal(idx.books.reduce((s, b) => s + b.chapters.length, 0), 1189);
  assert.equal(
    idx.books.reduce((s, b) => s + b.chapters.reduce((t, c) => t + c.verses, 0), 0),
    31194
  );
});

test('첫 절과 마지막 절의 ID 가 0 과 31193 이다', { skip }, () => {
  assert.equal(idx.books[0].title, '창세기');
  assert.equal(idx.books[0].firstVerseId, 0);
  assert.equal(idx.books[65].title, '요한 계시록');
  assert.equal(idx.books[65].lastVerseId, 31193);
});

test('마태복음 24장은 51절이고 첫 절 ID 가 24074 이다', { skip }, () => {
  const mt = idx.books.find(b => b.num === 40);
  assert.equal(mt.title, '마태복음');
  assert.equal(mt.slug, '40-마태복음');
  const ch24 = mt.chapters.find(c => c.num === 24);
  assert.equal(ch24.verses, 51);
  assert.equal(ch24.firstVerseId, 24074);
});

test('절 ID 구간이 빈틈없이 이어진다', { skip }, () => {
  let expected = 0;
  for (const b of idx.books) {
    for (const c of b.chapters) {
      assert.equal(c.firstVerseId, expected, `${b.title} ${c.num}장의 시작 ID 가 어긋난다`);
      expected = c.lastVerseId + 1;
    }
  }
  assert.equal(expected, 31194);
});
```

- [ ] **Step 2: 테스트를 돌려 건너뛰는지 확인한다**

Run: `npm test`
Expected: `core/bible/index.json` 이 없으므로 5개 테스트 모두 skip 으로 표시된다

- [ ] **Step 3: `scripts/extract-index.mjs` 를 구현한다**

```js
// SQLite DB 에서 권·장·절 인덱스를 뽑아 core/bible/index.json 으로 저장하는 스크립트
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';

const DB = process.argv[2] ?? '.cache/nwtsty_KO.db';
const OUT = 'core/bible/index.json';

const db = new DatabaseSync(DB, { readOnly: true });
const bookRows = db.prepare(
  'SELECT BibleBookId num, BookDisplayTitle title, FirstVerseId, LastVerseId FROM BibleBook ORDER BY BibleBookId'
).all();
const chapterRows = db.prepare(
  'SELECT BookNumber, ChapterNumber, FirstVerseId, LastVerseId FROM BibleChapter ORDER BY BookNumber, ChapterNumber'
).all();
db.close();

const books = bookRows.map(b => ({
  num: b.num,
  title: b.title,
  slug: `${String(b.num).padStart(2, '0')}-${b.title.replace(/\s+/g, '')}`,
  firstVerseId: b.FirstVerseId,
  lastVerseId: b.LastVerseId,
  chapters: chapterRows
    .filter(c => c.BookNumber === b.num)
    .map(c => ({
      num: c.ChapterNumber,
      firstVerseId: c.FirstVerseId,
      lastVerseId: c.LastVerseId,
      verses: c.LastVerseId - c.FirstVerseId + 1,
    })),
}));

const index = {
  source: 'nwtsty_KO.jwpub — 신세계역 성경 (연구용), 2024',
  generatedAt: new Date().toISOString().slice(0, 10),
  totals: {
    books: books.length,
    chapters: books.reduce((s, b) => s + b.chapters.length, 0),
    verses: books.reduce((s, b) => s + b.chapters.reduce((t, c) => t + c.verses, 0), 0),
  },
  books,
};

mkdirSync('core/bible', { recursive: true });
writeFileSync(OUT, JSON.stringify(index, null, 2) + '\n', 'utf8');
console.log(`생성: ${OUT} — ${index.totals.books}권 ${index.totals.chapters}장 ${index.totals.verses}절`);
```

- [ ] **Step 4: 실행하고 테스트가 통과하는지 확인한다**

Run: `npm run extract:index && npm test`
Expected: `생성: core/bible/index.json — 66권 1189장 31194절` 출력 후 5개 테스트 모두 PASS

- [ ] **Step 5: 커밋한다**

```bash
git add scripts/extract-index.mjs scripts/extract-index.test.mjs core/bible/index.json
git commit -m "성경 권·장·절 인덱스 추출 — 66권 1189장 31194절"
```

---

### Task 3: 성구 주소 변환 모듈

**Files:**
- Create: `src/verse-address.mjs`
- Test: `src/verse-address.test.mjs`

**Interfaces:**
- Consumes: `core/bible/index.json` (Task 2)
- Produces:
  - `loadIndex(path?: string) => Index` — 기본 경로는 `core/bible/index.json`
  - `toAddress(index, verseId: number) => { book: number, title: string, chapter: number, verse: number }`
  - `toVerseId(index, book: number, chapter: number, verse: number) => number`
  - `formatAddress(index, verseId: number) => string` — 예 `"마태복음 24:14"`
  - `parseReference(index, text: string) => { book, chapter, verse }` — 예 `"마태복음 24:14"` 를 해석한다
  - 범위를 벗어나면 모두 `Error` 를 던진다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`src/verse-address.test.mjs`

```js
// 성구 주소 변환이 양방향으로 정확한지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex, toAddress, toVerseId, formatAddress, parseReference } from './verse-address.mjs';

const skip = !existsSync('core/bible/index.json');
const idx = skip ? null : loadIndex();

test('절 ID 를 주소로 바꾼다', { skip }, () => {
  assert.deepEqual(toAddress(idx, 0), { book: 1, title: '창세기', chapter: 1, verse: 1 });
  assert.deepEqual(toAddress(idx, 24086), { book: 40, title: '마태복음', chapter: 24, verse: 13 });
  assert.deepEqual(toAddress(idx, 31193), { book: 66, title: '요한 계시록', chapter: 22, verse: 21 });
});

test('주소를 절 ID 로 바꾼다', { skip }, () => {
  assert.equal(toVerseId(idx, 1, 1, 1), 0);
  assert.equal(toVerseId(idx, 40, 24, 14), 24087);
  assert.equal(toVerseId(idx, 66, 22, 21), 31193);
});

test('양방향 변환이 31194개 절 전부에서 일치한다', { skip }, () => {
  for (let id = 0; id < idx.totals.verses; id++) {
    const a = toAddress(idx, id);
    assert.equal(toVerseId(idx, a.book, a.chapter, a.verse), id);
  }
});

test('주소를 문자열로 포맷한다', { skip }, () => {
  assert.equal(formatAddress(idx, 24087), '마태복음 24:14');
});

test('문자열 성구를 해석한다', { skip }, () => {
  assert.deepEqual(parseReference(idx, '마태복음 24:14'), { book: 40, chapter: 24, verse: 14 });
  assert.deepEqual(parseReference(idx, '요한 계시록 22:21'), { book: 66, chapter: 22, verse: 21 });
});

test('범위를 벗어나면 오류를 던진다', { skip }, () => {
  assert.throws(() => toAddress(idx, -1), /범위/);
  assert.throws(() => toAddress(idx, 31194), /범위/);
  assert.throws(() => toVerseId(idx, 40, 24, 52), /범위/);
  assert.throws(() => parseReference(idx, '없는책 1:1'), /권을 찾을 수 없다/);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './verse-address.mjs'`

- [ ] **Step 3: `src/verse-address.mjs` 를 구현한다**

```js
// 절 ID 와 사람이 읽는 성구 주소 사이를 양방향으로 변환하는 모듈
import { readFileSync } from 'node:fs';

export function loadIndex(path = 'core/bible/index.json') {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function toAddress(index, verseId) {
  if (!Number.isInteger(verseId) || verseId < 0 || verseId >= index.totals.verses) {
    throw new Error(`절 ID 가 범위를 벗어났다: ${verseId}`);
  }
  for (const b of index.books) {
    if (verseId < b.firstVerseId || verseId > b.lastVerseId) continue;
    for (const c of b.chapters) {
      if (verseId < c.firstVerseId || verseId > c.lastVerseId) continue;
      return { book: b.num, title: b.title, chapter: c.num, verse: verseId - c.firstVerseId + 1 };
    }
  }
  throw new Error(`절 ID 에 해당하는 장을 찾을 수 없다: ${verseId}`);
}

export function toVerseId(index, book, chapter, verse) {
  const b = index.books.find(x => x.num === book);
  if (!b) throw new Error(`권을 찾을 수 없다: ${book}`);
  const c = b.chapters.find(x => x.num === chapter);
  if (!c) throw new Error(`장이 범위를 벗어났다: ${b.title} ${chapter}장`);
  if (!Number.isInteger(verse) || verse < 1 || verse > c.verses) {
    throw new Error(`절이 범위를 벗어났다: ${b.title} ${chapter}:${verse}`);
  }
  return c.firstVerseId + verse - 1;
}

export function formatAddress(index, verseId) {
  const a = toAddress(index, verseId);
  return `${a.title} ${a.chapter}:${a.verse}`;
}

export function parseReference(index, text) {
  const m = String(text).trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) throw new Error(`성구 형식을 해석할 수 없다: ${text}`);
  const title = m[1].trim();
  const b = index.books.find(x => x.title === title || x.title.replace(/\s+/g, '') === title.replace(/\s+/g, ''));
  if (!b) throw new Error(`권을 찾을 수 없다: ${title}`);
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  toVerseId(index, b.num, chapter, verse); // 범위 검증을 겸한다
  return { book: b.num, chapter, verse };
}
```

- [ ] **Step 4: 테스트가 통과하는지 확인한다**

Run: `npm test`
Expected: PASS — 6개 테스트 통과. 양방향 검증 테스트가 31,194회 왕복을 모두 통과한다

- [ ] **Step 5: 커밋한다**

```bash
git add src/verse-address.mjs src/verse-address.test.mjs
git commit -m "성구 주소 변환 모듈 추가 — 절 ID 와 주소 양방향 변환"
```

---

### Task 4: wol 장 페이지 파서

**Files:**
- Create: `src/wol-chapter.mjs`
- Test: `src/wol-chapter.test.mjs`
- Create: `tests/fixtures/wol-40-24.html` (실제 응답을 저장한 픽스처)

**Interfaces:**
- Consumes: 없음 (순수 함수)
- Produces:
  - `chapterUrl(book: number, chapter: number) => string`
  - `parseChapter(html: string) => Array<{ book: number, chapter: number, verse: number, text: string }>`
  - 파싱 결과는 절 번호 오름차순이며, `text` 에는 절 번호·상호참조 기호(`+`)·각주 기호가 들어 있지 않다

- [ ] **Step 1: 픽스처를 내려받아 저장한다**

Run:
```bash
node --no-warnings -e "const r=await fetch('https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/40/24');const {mkdirSync,writeFileSync}=await import('node:fs');mkdirSync('tests/fixtures',{recursive:true});writeFileSync('tests/fixtures/wol-40-24.html',await r.text(),'utf8');console.log('저장 완료',r.status);"
```
Expected: `저장 완료 200` 이 출력되고 `tests/fixtures/wol-40-24.html` 이 약 315KB로 생성된다

- [ ] **Step 2: 실패하는 테스트를 쓴다**

`src/wol-chapter.test.mjs`

```js
// wol 장 페이지 파서가 절을 정확히 뽑아내는지 픽스처로 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chapterUrl, parseChapter } from './wol-chapter.mjs';

const FIX = 'tests/fixtures/wol-40-24.html';
const skip = !existsSync(FIX);
const html = skip ? '' : readFileSync(FIX, 'utf8');

test('장 URL 을 만든다', () => {
  assert.equal(chapterUrl(40, 24), 'https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/40/24');
  assert.equal(chapterUrl(1, 1), 'https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/1/1');
});

test('마태복음 24장에서 51개 절을 뽑는다', { skip }, () => {
  const verses = parseChapter(html);
  assert.equal(verses.length, 51);
  assert.equal(verses[0].verse, 1);
  assert.equal(verses[50].verse, 51);
  assert.ok(verses.every(v => v.book === 40 && v.chapter === 24));
});

test('절 번호가 1부터 빠짐없이 이어진다', { skip }, () => {
  const verses = parseChapter(html);
  verses.forEach((v, i) => assert.equal(v.verse, i + 1));
});

test('13절과 14절 본문이 정확하다', { skip }, () => {
  const verses = parseChapter(html);
  const v13 = verses.find(v => v.verse === 13);
  const v14 = verses.find(v => v.verse === 14);
  assert.equal(v13.text, '그러나 끝까지 인내하는 사람은 구원을 받을 것입니다.');
  assert.equal(
    v14.text,
    '그리고 이 왕국의 좋은 소식이 모든 민족에게 증거되기 위해 사람이 거주하는 온 땅에 전파될 것입니다. 그리고 끝이 올 것입니다.'
  );
});

test('본문에 태그와 참조 기호가 남아 있지 않다', { skip }, () => {
  for (const v of parseChapter(html)) {
    assert.ok(!v.text.includes('<'), `${v.verse}절에 태그가 남아 있다`);
    assert.ok(!v.text.includes('&nbsp;'), `${v.verse}절에 엔티티가 남아 있다`);
    assert.ok(!/^\d/.test(v.text), `${v.verse}절이 숫자로 시작한다`);
    assert.ok(v.text.length > 0, `${v.verse}절이 비어 있다`);
  }
});
```

- [ ] **Step 3: 테스트를 돌려 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './wol-chapter.mjs'`

- [ ] **Step 4: `src/wol-chapter.mjs` 를 구현한다**

```js
// wol.jw.org 장 페이지 HTML 에서 절 본문을 뽑아내는 파서
const VERSE_OPEN = /<span id="v(\d+)-(\d+)-(\d+)-\d+" class="v">/g;

export function chapterUrl(book, chapter) {
  return `https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/${book}/${chapter}`;
}

// 여는 태그 바로 뒤부터 짝이 맞는 </span> 직전까지를 잘라낸다
function sliceBalanced(html, from) {
  const re = /<(\/?)span\b[^>]*>/g;
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(from, m.index);
  }
  return html.slice(from);
}

function toPlainText(fragment, verseNumber) {
  const text = fragment
    // 상호참조(+) 와 각주(*) 링크를 통째로 제거한다
    .replace(/<a\b[^>]*class="[^"]*\bb\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a\b[^>]*class="[^"]*\bfn\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
  return text.replace(new RegExp(`^${verseNumber}\\s*`), '').trim();
}

export function parseChapter(html) {
  const marks = [];
  VERSE_OPEN.lastIndex = 0;
  let m;
  while ((m = VERSE_OPEN.exec(html))) {
    marks.push({
      book: Number(m[1]),
      chapter: Number(m[2]),
      verse: Number(m[3]),
      contentStart: VERSE_OPEN.lastIndex,
    });
  }
  const byVerse = new Map();
  for (const mark of marks) {
    const raw = sliceBalanced(html, mark.contentStart);
    const text = toPlainText(raw, mark.verse);
    // 한 절이 여러 조각으로 나뉘어 나오면 이어 붙인다
    const prev = byVerse.get(mark.verse);
    byVerse.set(mark.verse, {
      book: mark.book,
      chapter: mark.chapter,
      verse: mark.verse,
      text: prev ? `${prev.text} ${text}`.trim() : text,
    });
  }
  return [...byVerse.values()].sort((a, b) => a.verse - b.verse);
}
```

- [ ] **Step 5: 테스트가 통과하는지 확인한다**

Run: `npm test`
Expected: PASS — 5개 테스트 통과

- [ ] **Step 6: 커밋한다**

```bash
git add src/wol-chapter.mjs src/wol-chapter.test.mjs tests/fixtures/wol-40-24.html
git commit -m "wol 장 페이지 파서 추가 — 마태 24장 51절 검증"
```

---

### Task 5: 전권 본문 수집과 무결성 검증

**Files:**
- Create: `scripts/fetch-bible.mjs`
- Create: `scripts/verify-bible.mjs`
- Test: `scripts/verify-bible.test.mjs`
- 산출물: `core/bible/text/01-창세기.md` … `66-요한계시록.md` (66개), `.cache/wol/` (원본 HTML)

**Interfaces:**
- Consumes: `core/bible/index.json` (Task 2), `chapterUrl`/`parseChapter` (Task 4)
- Produces:
  - `core/bible/text/<slug>.md` — 한 줄이 `장:절\t본문` 형식이며 장·절 오름차순으로 정렬된다
  - `verifyBible(index) => { ok: boolean, problems: string[] }` (`scripts/verify-bible.mjs` 에서 export)

- [ ] **Step 1: `scripts/fetch-bible.mjs` 를 만든다**

원본 HTML을 `.cache/wol/` 에 먼저 저장하고, 그 캐시에서 파싱한다. 중간에 끊겨도 이미 받은 장은 다시 받지 않는다.

```js
// wol 에서 성경 전권을 장 단위로 받아 core/bible/text 아래 권별 파일로 저장하는 스크립트
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex } from '../src/verse-address.mjs';
import { chapterUrl, parseChapter } from '../src/wol-chapter.mjs';

const CACHE = '.cache/wol';
const OUT_DIR = 'core/bible/text';
const DELAY_MS = 1500;

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getChapterHtml(book, chapter) {
  const file = join(CACHE, `${book}-${chapter}.html`);
  if (existsSync(file)) return readFileSync(file, 'utf8');
  const url = chapterUrl(book, chapter);
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      writeFileSync(file, html, 'utf8');
      await sleep(DELAY_MS);
      return html;
    } catch (e) {
      console.error(`  재시도 ${attempt}/3 — ${book}/${chapter} — ${e.message}`);
      if (attempt === 3) throw e;
      await sleep(DELAY_MS * attempt * 2);
    }
  }
}

// 인덱스 경로를 인자로 받는다. 생략하면 core/bible/index.json 을 쓴다
const index = loadIndex(process.argv[2]);
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

let done = 0;
for (const book of index.books) {
  const lines = [];
  for (const ch of book.chapters) {
    const html = await getChapterHtml(book.num, ch.num);
    const verses = parseChapter(html);
    if (verses.length !== ch.verses) {
      throw new Error(
        `${book.title} ${ch.num}장의 절 수가 맞지 않는다 — 기준 ${ch.verses}, 수집 ${verses.length}`
      );
    }
    for (const v of verses) lines.push(`${ch.num}:${v.verse}\t${v.text}`);
    done++;
    if (done % 50 === 0) console.log(`  ${done}/${index.totals.chapters}장`);
  }
  writeFileSync(join(OUT_DIR, `${book.slug}.md`), lines.join('\n') + '\n', 'utf8');
  console.log(`완료: ${book.slug}.md — ${lines.length}절`);
}
console.log(`전체 완료 — ${done}장`);
```

- [ ] **Step 2: 창세기 한 권만 먼저 돌려 형식을 눈으로 확인한다**

소스는 건드리지 않는다. 창세기만 담은 임시 인덱스를 만들어 인자로 넘긴다.

```bash
node --no-warnings -e "
const {loadIndex}=await import('./src/verse-address.mjs');
const {writeFileSync}=await import('node:fs');
const i=loadIndex(); i.books=i.books.slice(0,1);
i.totals={books:1,chapters:i.books[0].chapters.length,verses:i.books[0].lastVerseId+1};
writeFileSync('.cache/index-genesis.json', JSON.stringify(i));
console.log('임시 인덱스 생성 —', i.totals.chapters, '장', i.totals.verses, '절');
"
node --no-warnings scripts/fetch-bible.mjs .cache/index-genesis.json
```

Expected: `임시 인덱스 생성 — 50 장 1533 절` 이 출력되고, `core/bible/text/01-창세기.md` 가 1,533줄로 생성된다. 각 줄은 `장:절`, 탭, 본문 순서다.

그 다음 첫 줄과 마지막 줄을 눈으로 확인한다.

```bash
node --no-warnings -e "
const {readFileSync}=await import('node:fs');
const L=readFileSync('core/bible/text/01-창세기.md','utf8').split('\n').filter(Boolean);
console.log('줄 수:', L.length);
console.log('첫 줄:', JSON.stringify(L[0]));
console.log('끝 줄:', JSON.stringify(L.at(-1)));
"
```

Expected: 줄 수는 1533, 첫 줄은 `1:1` 로 시작하고 탭 뒤에 창세기 1장 1절 본문이 있으며, 끝 줄은 `50:26` 으로 시작한다. **본문 내용은 여기에 적어 두지 않는다. 실제 출력을 읽고 어색한 곳이 없는지 사람이 판단한다.**

- [ ] **Step 3: 전권을 수집한다**

Run: `npm run fetch:bible`
Expected: 1,189장을 모두 받아 66개 파일이 생성된다. 1.5초 간격이므로 약 30분이 걸린다. 절 수가 기준과 다른 장이 하나라도 있으면 그 자리에서 오류로 멈춘다

- [ ] **Step 4: 실패하는 검증 테스트를 쓴다**

`scripts/verify-bible.test.mjs`

```js
// 수집된 성경 본문이 인덱스 기준선과 일치하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from '../src/verse-address.mjs';
import { verifyBible } from './verify-bible.mjs';

const skip = !existsSync('core/bible/text/01-창세기.md');

test('본문이 인덱스 기준선과 완전히 일치한다', { skip }, () => {
  const result = verifyBible(loadIndex());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});
```

- [ ] **Step 5: 테스트를 돌려 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `Cannot find module './verify-bible.mjs'`

- [ ] **Step 6: `scripts/verify-bible.mjs` 를 구현한다**

```js
// 수집된 성경 본문 파일이 인덱스 기준선과 어긋나는 곳이 없는지 검사하는 스크립트
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex } from '../src/verse-address.mjs';

const TEXT_DIR = 'core/bible/text';

export function verifyBible(index) {
  const problems = [];

  for (const book of index.books) {
    const file = join(TEXT_DIR, `${book.slug}.md`);
    if (!existsSync(file)) {
      problems.push(`파일이 없다: ${file}`);
      continue;
    }
    const lines = readFileSync(file, 'utf8').split('\n').filter(l => l.length > 0);

    const seen = new Map(); // "장:절" -> true
    for (const [i, line] of lines.entries()) {
      const m = line.match(/^(\d+):(\d+)\t(.+)$/);
      if (!m) {
        problems.push(`${book.slug} ${i + 1}번째 줄의 형식이 틀렸다`);
        continue;
      }
      const key = `${m[1]}:${m[2]}`;
      if (seen.has(key)) problems.push(`${book.title} ${key} 이 중복된다`);
      seen.set(key, true);
      if (m[3].trim().length === 0) problems.push(`${book.title} ${key} 이 비어 있다`);
    }

    for (const ch of book.chapters) {
      for (let v = 1; v <= ch.verses; v++) {
        if (!seen.has(`${ch.num}:${v}`)) problems.push(`${book.title} ${ch.num}:${v} 이 빠졌다`);
      }
    }

    const expected = book.chapters.reduce((s, c) => s + c.verses, 0);
    if (lines.length !== expected) {
      problems.push(`${book.title} 의 절 수가 다르다 — 기준 ${expected}, 실제 ${lines.length}`);
    }
  }

  return { ok: problems.length === 0, problems };
}

// 직접 실행했을 때만 보고서를 출력한다
if (import.meta.filename === process.argv[1]) {
  const result = verifyBible(loadIndex());
  if (result.ok) {
    console.log('검증 통과 — 66권 1189장 31194절이 기준선과 일치한다.');
  } else {
    console.error(`문제 ${result.problems.length}건`);
    for (const p of result.problems.slice(0, 50)) console.error('  ' + p);
    process.exit(1);
  }
}
```

- [ ] **Step 7: 검증을 실행하고 테스트가 통과하는지 확인한다**

Run: `npm run verify && npm test`
Expected: `검증 통과 — 66권 1189장 31194절이 기준선과 일치한다.` 출력 후 모든 테스트 PASS

- [ ] **Step 8: 커밋한다**

본문 66개 파일과 스크립트를 함께 커밋한다.

```bash
git add scripts/fetch-bible.mjs scripts/verify-bible.mjs scripts/verify-bible.test.mjs core/bible/text/
git commit -m "성경 전권 본문 수집과 무결성 검증 추가 — 31194절"
```

---

### Task 6: 상호 참조 추출

**Files:**
- Create: `scripts/extract-refs.mjs`
- Test: `scripts/extract-refs.test.mjs`
- 산출물: `core/bible/refs/<slug>.tsv` (66개)

**Interfaces:**
- Consumes: `.cache/nwtsty_KO.db` (Task 1), `core/bible/index.json` (Task 2), `formatAddress` (Task 3)
- Produces: `core/bible/refs/<slug>.tsv` — 각 줄이 `장:절\t참조1, 참조2, …` 형식이며 참조는 `마태복음 24:14` 같은 사람이 읽는 주소다

- [ ] **Step 1: 실패하는 테스트를 쓴다**

`scripts/extract-refs.test.mjs`

```js
// 상호 참조 추출 결과가 올바른 형식과 내용을 갖는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const FILE = 'core/bible/refs/40-마태복음.tsv';
const skip = !existsSync(FILE);
const lines = skip ? [] : readFileSync(FILE, 'utf8').split('\n').filter(Boolean);

test('모든 줄이 장:절 과 참조 목록으로 이루어진다', { skip }, () => {
  for (const line of lines) {
    assert.match(line, /^\d+:\d+\t.+$/, `형식이 틀린 줄: ${line}`);
  }
});

test('마태복음 24:14 의 참조가 7건이다', { skip }, () => {
  const line = lines.find(l => l.startsWith('24:14\t'));
  assert.ok(line, '24:14 줄이 없다');
  const refs = line.split('\t')[1].split(', ');
  assert.equal(refs.length, 7);
  assert.ok(refs.every(r => /^.+ \d+:\d+$/.test(r)), `주소 형식이 아닌 참조가 있다: ${refs}`);
});

test('전체 참조 줄 수가 0보다 많다', { skip }, () => {
  assert.ok(lines.length > 0);
});
```

- [ ] **Step 2: 테스트를 돌려 건너뛰는지 확인한다**

Run: `npm test`
Expected: 파일이 없으므로 3개 테스트 모두 skip

- [ ] **Step 3: `scripts/extract-refs.mjs` 를 구현한다**

```js
// DB 의 절-대-절 난외 상호참조를 권별 TSV 파일로 뽑아내는 스크립트
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex, toAddress, formatAddress } from '../src/verse-address.mjs';

const DB = process.argv[2] ?? '.cache/nwtsty_KO.db';
const OUT_DIR = 'core/bible/refs';

const index = loadIndex();
const db = new DatabaseSync(DB, { readOnly: true });
const rows = db.prepare(`
  SELECT BibleVerseId AS src, FirstBibleVerseId AS from_, LastBibleVerseId AS to_
  FROM BibleCitation
  WHERE BibleVerseId IS NOT NULL
  ORDER BY BibleVerseId, SortPosition
`).all();
db.close();

// 출발 절별로 참조를 모은다
const byVerse = new Map();
for (const r of rows) {
  const label = r.from_ === r.to_
    ? formatAddress(index, r.from_)
    : `${formatAddress(index, r.from_)}-${toAddress(index, r.to_).verse}`;
  if (!byVerse.has(r.src)) byVerse.set(r.src, []);
  byVerse.get(r.src).push(label);
}

mkdirSync(OUT_DIR, { recursive: true });
let total = 0;
for (const book of index.books) {
  const lines = [];
  for (const ch of book.chapters) {
    // 절 번호는 1 부터 시작하지 않을 수 있다. Task 7 의 정정을 따른다
    for (let v = ch.firstVerseNumber; v <= ch.lastVerseNumber; v++) {
      const id = ch.firstVerseId + (v - ch.firstVerseNumber);
      const refs = byVerse.get(id);
      if (!refs || refs.length === 0) continue;
      lines.push(`${ch.num}:${v}\t${refs.join(', ')}`);
      total += refs.length;
    }
  }
  writeFileSync(join(OUT_DIR, `${book.slug}.tsv`), lines.join('\n') + '\n', 'utf8');
}
console.log(`생성: ${OUT_DIR} — 참조 ${total}건`);
```

- [ ] **Step 4: 실행하고 테스트가 통과하는지 확인한다**

Run: `npm run extract:refs && npm test`
Expected: `생성: core/bible/refs — 참조 65578건` 출력 후 3개 테스트 PASS

- [ ] **Step 5: 커밋한다**

```bash
git add scripts/extract-refs.mjs scripts/extract-refs.test.mjs core/bible/refs/
git commit -m "상호 참조 추출 추가 — 절-대-절 난외 참조 65578건"
```

---

### Task 7: 절 번호 모델 정정

**이 태스크는 Task 6 보다 먼저 수행한다.** 위의 "계획 결함 정정" 절이 배경이다.

**Files:**
- Modify: `scripts/extract-index.mjs`
- Modify: `src/verse-address.mjs`
- Modify: `src/verse-address.test.mjs`
- Modify: `scripts/verify-bible.mjs`
- Modify: `scripts/extract-index.test.mjs`
- 재생성: `core/bible/index.json`

**Interfaces:**
- `core/bible/index.json` 의 각 장 객체에 두 필드를 더한다.
  - `firstVerseNumber: number` — 그 장의 첫 절 번호. 시편 표제가 있으면 0, 요한복음 8장은 12, 그 밖에는 1
  - `lastVerseNumber: number` — `firstVerseNumber + verses - 1`
  - 기존 `num` · `firstVerseId` · `lastVerseId` · `verses` 는 그대로 둔다. `verses` 는 행 수이며 표제를 포함한다
- `toAddress(index, verseId)` 는 `verse` 를 `firstVerseNumber + (verseId - firstVerseId)` 로 계산한다
- `toVerseId(index, book, chapter, verse)` 는 `firstVerseId + (verse - firstVerseNumber)` 를 돌려주고, `verse` 가 `firstVerseNumber..lastVerseNumber` 밖이면 오류를 던진다
- `verifyBible(index)` 는 `1..verses` 가 아니라 `firstVerseNumber..lastVerseNumber` 가 본문에 모두 있는지 검사한다

- [ ] **Step 1: 실패하는 테스트를 먼저 쓴다**

`src/verse-address.test.mjs` 에 아래 테스트를 더한다. 기존 테스트는 지우지 않는다.

```js
test('시편 표제는 0절이고 마지막 절이 밀리지 않는다', { skip }, () => {
  assert.equal(toVerseId(idx, 19, 3, 0), 13958);   // 표제
  assert.equal(toVerseId(idx, 19, 3, 1), 13959);
  assert.equal(toVerseId(idx, 19, 3, 8), 13966);   // 정정 전에는 13965 를 내놓았다
  assert.deepEqual(toAddress(idx, 13958), { book: 19, title: '시편', chapter: 3, verse: 0 });
  assert.deepEqual(toAddress(idx, 13966), { book: 19, title: '시편', chapter: 3, verse: 8 });
  assert.throws(() => toVerseId(idx, 19, 3, 9), /범위/);
});

test('요한복음 8장은 12절에서 시작한다', { skip }, () => {
  assert.equal(toVerseId(idx, 43, 8, 12), 26485);
  assert.equal(toVerseId(idx, 43, 8, 59), 26532);
  assert.deepEqual(toAddress(idx, 26485), { book: 43, title: '요한복음', chapter: 8, verse: 12 });
  assert.throws(() => toVerseId(idx, 43, 8, 11), /범위/);
  assert.throws(() => toVerseId(idx, 43, 8, 1), /범위/);
});

test('표제도 예외도 없는 장은 1절에서 시작한다', { skip }, () => {
  assert.equal(toVerseId(idx, 1, 1, 1), 0);
  assert.equal(toVerseId(idx, 40, 24, 14), 24087);
  assert.equal(toVerseId(idx, 66, 22, 21), 31193);
});
```

`scripts/extract-index.test.mjs` 에도 더한다.

```js
test('장마다 절 번호 범위가 기록된다', { skip }, () => {
  const ps3 = idx.books.find(b => b.num === 19).chapters.find(c => c.num === 3);
  assert.equal(ps3.firstVerseNumber, 0);
  assert.equal(ps3.lastVerseNumber, 8);
  const jn8 = idx.books.find(b => b.num === 43).chapters.find(c => c.num === 8);
  assert.equal(jn8.firstVerseNumber, 12);
  assert.equal(jn8.lastVerseNumber, 59);
  const gn1 = idx.books.find(b => b.num === 1).chapters.find(c => c.num === 1);
  assert.equal(gn1.firstVerseNumber, 1);
  assert.equal(gn1.lastVerseNumber, 31);
});

test('시작 번호가 0 또는 1이 아닌 장은 요한복음 8장 하나뿐이다', { skip }, () => {
  const odd = [];
  for (const b of idx.books) {
    for (const c of b.chapters) {
      if (c.firstVerseNumber !== 1 && c.firstVerseNumber !== 0) odd.push(`${b.title} ${c.num}`);
    }
  }
  assert.deepEqual(odd, ['요한복음 8']);
});

test('표제가 있는 장은 정확히 116개다', { skip }, () => {
  let n = 0;
  for (const b of idx.books) for (const c of b.chapters) if (c.firstVerseNumber === 0) n++;
  assert.equal(n, 116);
});
```

- [ ] **Step 2: 테스트를 돌려 실패를 확인한다**

Run: `npm test`
Expected: FAIL — `firstVerseNumber` 가 `undefined` 라서 새 테스트들이 깨진다

- [ ] **Step 3: `scripts/extract-index.mjs` 에 절 번호 범위를 더한다**

각 장 마지막 행의 `Label` 에서 시작 번호를 역산한다. 마지막 행의 라벨은 언제나 진짜 절 번호다.

```js
// BibleVerse.Label 은 HTML 이 섞여 있으므로 태그를 걷어내고 숫자만 본다
const labelRows = db.prepare(
  'SELECT BibleVerseId id, Label FROM BibleVerse ORDER BY BibleVerseId'
).all();
const labelOf = new Map(
  labelRows.map(r => [r.id, String(r.Label ?? '').replace(/<[^>]*>/g, '').trim()])
);

function firstVerseNumberOf(chapter) {
  const rows = chapter.lastVerseId - chapter.firstVerseId + 1;
  const last = labelOf.get(chapter.lastVerseId);
  if (!/^\d+$/.test(last)) {
    throw new Error(`마지막 절의 라벨이 숫자가 아니다: id ${chapter.lastVerseId} = ${JSON.stringify(last)}`);
  }
  return Number(last) - (rows - 1);
}
```

각 장 객체를 만들 때 `firstVerseNumber` 와 `lastVerseNumber` 를 채운다.

- [ ] **Step 4: 인덱스를 재생성하고 결과를 눈으로 확인한다**

Run: `npm run extract:index`
그 다음 시편 3편·요한복음 8장·창세기 1장의 세 필드를 출력해 각각 `0/8`, `12/59`, `1/31` 인지 확인한다.

- [ ] **Step 5: `src/verse-address.mjs` 를 정정한다**

`toAddress` 의 `verse` 계산을 `c.firstVerseNumber + (verseId - c.firstVerseId)` 로 바꾼다.
`toVerseId` 의 범위 검사를 `verse < c.firstVerseNumber || verse > c.lastVerseNumber` 로 바꾸고,
반환값을 `c.firstVerseId + (verse - c.firstVerseNumber)` 로 바꾼다.
`Number.isInteger(verse)` 검사는 그대로 둔다.

- [ ] **Step 6: `scripts/verify-bible.mjs` 를 정정한다**

빠진 절을 찾는 반복문을 `for (let v = ch.firstVerseNumber; v <= ch.lastVerseNumber; v++)` 로 바꾼다.
HTML 태그·잔류 엔티티 검사와 중복 검사는 그대로 둔다.

- [ ] **Step 7: 전부 통과하는지 확인한다**

Run: `npm test`
Expected: PASS — 새 테스트를 포함해 전부 통과하고, skip 으로 빠지는 것이 없다

Run: `npm run verify`
Expected: `검증 통과 — 66권 1189장 31194절이 기준선과 일치한다.` 127건이 0건이 되어야 한다

- [ ] **Step 8: 커밋한다**

```bash
git add scripts/extract-index.mjs scripts/extract-index.test.mjs \
        src/verse-address.mjs src/verse-address.test.mjs \
        scripts/verify-bible.mjs core/bible/index.json checklist.md
git commit -m "절 번호 모델 정정 — 시편 표제 0절과 요한복음 8장 시작 절 반영"
```

---

## 완료 기준

1단계는 아래가 모두 참일 때 끝난 것으로 본다.

- `npm test` 가 전부 통과한다
- `npm run verify` 가 `검증 통과 — 66권 1189장 31194절이 기준선과 일치한다.` 를 출력한다
- `core/bible/text/` 에 66개 파일, `core/bible/refs/` 에 66개 파일이 있다
- `core/bible/index.json` 이 있고 총계가 66 / 1189 / 31194 이다
- 임의의 성구를 검색하면 `<파일>:<장>:<절>` 형태로 위치가 즉시 드러난다

이 시점에서 프로젝트는 워크플로가 하나도 없어도 **성경 전문 검색 도구**로서 값어치를 한다.

## 이 계획에서 다루지 않는 것

- **연구 노트와 각주 본문.** 스펙 §8은 이것을 1단계에 넣었지만 이 계획에서는 3단계로 미룬다. jwpub DB 안에서는 암호화되어 있어 쓸 수 없고, wol 에서 가져오려면 절마다 별도 요청이 필요해 31,194회 요청이 든다. 본문 1,189회와 성격이 완전히 다른 작업이라 한 계획에 묶으면 1단계가 끝나지 않는다. **스펙에서 의도적으로 벗어난 항목이므로 여기 적어 둔다**
- `core/bible/notes/` 디렉토리. 위와 같은 이유로 3단계에서 만든다
- `scripts/verify-links.mjs`. 검사할 노트가 아직 없다. 3단계에서 만든다
- 삽화 702개
- 다섯 개 워크플로. 2단계 이후에 다룬다
