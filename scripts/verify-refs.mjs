// 상호 참조 산출물이 DB 재계산 값·형식·범위·총량 기준과 어긋나는 곳이 없는지 검사하는 스크립트
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex, toAddress, formatAddress } from '../src/verse-address.mjs';

const REFS_DIR = 'core/bible/refs';
const EXPECTED_TOTAL = 65578;

// DB 의 BibleCitation 을 extract-refs.mjs 와 동일한 규칙으로 절 ID -> 참조 라벨 배열로 재계산한다
function computeExpectedRefs(index, dbPath) {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const rows = db.prepare(`
    SELECT BibleVerseId AS src, FirstBibleVerseId AS from_, LastBibleVerseId AS to_
    FROM BibleCitation
    WHERE BibleVerseId IS NOT NULL
    ORDER BY BibleVerseId, SortPosition
  `).all();
  db.close();

  const byVerse = new Map();
  for (const r of rows) {
    let label;
    if (r.from_ === r.to_) {
      label = formatAddress(index, r.from_);
    } else {
      const from = toAddress(index, r.from_);
      const to = toAddress(index, r.to_);
      if (to.book !== from.book) {
        label = `${formatAddress(index, r.from_)}-${formatAddress(index, r.to_)}`;
      } else if (to.chapter !== from.chapter) {
        label = `${formatAddress(index, r.from_)}-${to.chapter}:${to.verse}`;
      } else {
        label = `${formatAddress(index, r.from_)}-${to.verse}`;
      }
    }
    if (!byVerse.has(r.src)) byVerse.set(r.src, []);
    byVerse.get(r.src).push(label);
  }
  return byVerse;
}

export function verifyRefs(index, dbPath = '.cache/nwtsty_KO.db') {
  const problems = [];
  const expected = computeExpectedRefs(index, dbPath);
  let total = 0;

  for (const book of index.books) {
    const file = join(REFS_DIR, `${book.slug}.tsv`);
    if (!existsSync(file)) {
      problems.push(`파일이 없다: ${file}`);
      continue;
    }
    const lines = readFileSync(file, 'utf8').split('\n').filter(l => l.length > 0);
    const actual = new Map(); // "장:절" -> 참조 문자열

    for (const [i, line] of lines.entries()) {
      const m = line.match(/^(\d+):(\d+)\t(.+)$/);
      if (!m) {
        problems.push(`${book.slug} ${i + 1}번째 줄의 형식이 틀렸다: ${line}`);
        continue;
      }
      const chapterNum = Number(m[1]);
      const verseNum = Number(m[2]);
      const key = `${chapterNum}:${verseNum}`;
      const chapter = book.chapters.find(c => c.num === chapterNum);
      if (!chapter) {
        problems.push(`${book.title} ${key} — ${chapterNum}장이 인덱스에 없다`);
      } else if (verseNum < chapter.firstVerseNumber || verseNum > chapter.lastVerseNumber) {
        problems.push(
          `${book.title} ${key} 이 절 번호 범위(${chapter.firstVerseNumber}..${chapter.lastVerseNumber})를 벗어났다`
        );
      }
      actual.set(key, m[3]);
      total += m[3].split(', ').length;
    }

    for (const ch of book.chapters) {
      for (let v = ch.firstVerseNumber; v <= ch.lastVerseNumber; v++) {
        const id = ch.firstVerseId + (v - ch.firstVerseNumber);
        const key = `${ch.num}:${v}`;
        const expectedRefs = expected.get(id);
        const expectedStr = expectedRefs && expectedRefs.length > 0 ? expectedRefs.join(', ') : undefined;
        const actualStr = actual.get(key);
        if (expectedStr === undefined && actualStr !== undefined) {
          problems.push(`${book.title} ${key} 은 참조가 없어야 하는데 있다 — 실제 ${actualStr}`);
        } else if (expectedStr !== undefined && actualStr === undefined) {
          problems.push(`${book.title} ${key} 의 참조가 빠졌다 — 기준 ${expectedStr}`);
        } else if (expectedStr !== undefined && expectedStr !== actualStr) {
          problems.push(`${book.title} ${key} 의 참조가 다르다 — 기준 ${expectedStr}, 실제 ${actualStr}`);
        }
      }
    }
  }

  if (total !== EXPECTED_TOTAL) {
    problems.push(`전체 참조 수가 다르다 — 기준 ${EXPECTED_TOTAL}, 실제 ${total}`);
  }

  return { ok: problems.length === 0, problems };
}

// 직접 실행했을 때만 보고서를 출력한다
if (import.meta.filename === process.argv[1]) {
  const result = verifyRefs(loadIndex(), process.argv[2]);
  if (result.ok) {
    console.log(`검증 통과 — 참조 ${EXPECTED_TOTAL}건이 DB 재계산 값과 일치한다.`);
  } else {
    console.error(`문제 ${result.problems.length}건`);
    for (const p of result.problems.slice(0, 50)) console.error('  ' + p);
    process.exit(1);
  }
}
