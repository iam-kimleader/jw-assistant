// 수집된 성경 본문 파일이 인덱스 기준선과 어긋나는 곳이 없는지 검사하는 스크립트
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex } from '../src/verse-address.mjs';
import { splitLines } from '../src/text-lines.mjs';

const TEXT_DIR = 'core/bible/text';

// HTML 태그가 남아 있는지 검사한다
const HTML_TAG = /<[^>]*>/;
// 명명(&nbsp;) · 10진(&#160;) · 16진 소문자(&#xa0;) · 16진 대문자(&#XA0;) 엔티티를 모두 잡아낸다
const RESIDUAL_ENTITY = /&(#[xX][0-9a-fA-F]+|#\d+|[a-zA-Z]+);/;

export function verifyBible(index) {
  const problems = [];

  for (const book of index.books) {
    const file = join(TEXT_DIR, `${book.slug}.md`);
    if (!existsSync(file)) {
      problems.push(`파일이 없다: ${file}`);
      continue;
    }
    const lines = splitLines(readFileSync(file, 'utf8')).filter(l => l.length > 0);

    const seen = new Map(); // "장:절" -> true
    let prevChapter = -Infinity;
    let prevVerse = -Infinity;
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
      if (HTML_TAG.test(m[3])) problems.push(`${book.title} ${key} 에 HTML 태그가 남아 있다`);
      if (RESIDUAL_ENTITY.test(m[3])) problems.push(`${book.title} ${key} 에 잔류 HTML 엔티티가 남아 있다`);
      const chapter = Number(m[1]);
      const verse = Number(m[2]);
      if (chapter < prevChapter || (chapter === prevChapter && verse <= prevVerse)) {
        problems.push(`${book.title} ${key} 이 앞 절보다 순서가 뒤로 간다`);
      }
      prevChapter = chapter;
      prevVerse = verse;
    }

    for (const ch of book.chapters) {
      for (let v = ch.firstVerseNumber; v <= ch.lastVerseNumber; v++) {
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
