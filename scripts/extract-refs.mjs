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
  let label;
  if (r.from_ === r.to_) {
    label = formatAddress(index, r.from_);
  } else {
    if (r.from_ > r.to_) {
      throw new Error(`범위가 거꾸로 됐다 — 참조원 절 ID ${r.src}, from ${r.from_} > to ${r.to_}`);
    }
    const from = toAddress(index, r.from_);
    const to = toAddress(index, r.to_);
    if (to.book !== from.book) {
      // 책이 달라지는 범위 — 끝 주소를 통째로 적어야 틀리지 않는다
      label = `${formatAddress(index, r.from_)}-${formatAddress(index, r.to_)}`;
    } else if (to.chapter !== from.chapter) {
      // 장이 달라지는 범위 — 끝 절 앞에 장 번호를 반드시 붙인다 (안 붙이면 같은 장으로 오독된다)
      label = `${formatAddress(index, r.from_)}-${to.chapter}:${to.verse}`;
    } else {
      label = `${formatAddress(index, r.from_)}-${to.verse}`;
    }
  }
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
