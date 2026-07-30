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
