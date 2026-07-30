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
