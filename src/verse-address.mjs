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
      return { book: b.num, title: b.title, chapter: c.num, verse: c.firstVerseNumber + (verseId - c.firstVerseId) };
    }
  }
  throw new Error(`절 ID 에 해당하는 장을 찾을 수 없다: ${verseId}`);
}

export function toVerseId(index, book, chapter, verse) {
  const b = index.books.find(x => x.num === book);
  if (!b) throw new Error(`권을 찾을 수 없다: ${book}`);
  const c = b.chapters.find(x => x.num === chapter);
  if (!c) throw new Error(`장이 범위를 벗어났다: ${b.title} ${chapter}장`);
  if (!Number.isInteger(verse) || verse < c.firstVerseNumber || verse > c.lastVerseNumber) {
    throw new Error(`절이 범위를 벗어났다: ${b.title} ${chapter}:${verse}`);
  }
  return c.firstVerseId + (verse - c.firstVerseNumber);
}

export function formatAddress(index, verseId) {
  const a = toAddress(index, verseId);
  return `${a.title} ${a.chapter}:${a.verse}`;
}

export function parseReference(index, text) {
  const m = String(text).trim().match(/^(.+?)\s+(\d+):(\d+)$/);
  if (!m) throw new Error(`성구 형식을 해석할 수 없다: ${text}`);
  const b = findBook(index, m[1]);
  const chapter = Number(m[2]);
  const verse = Number(m[3]);
  toVerseId(index, b.num, chapter, verse); // 범위 검증을 겸한다
  return { book: b.num, chapter, verse };
}

// 권 이름은 공백(고린도 전서)과 숫자(요한 1서)를 품을 수 있으므로 공백을 무시하고 맞춘다
function findBook(index, title) {
  const wanted = title.trim();
  const squashed = wanted.replace(/\s+/g, '');
  const b = index.books.find(x => x.title === wanted || x.title.replace(/\s+/g, '') === squashed);
  if (!b) throw new Error(`권을 찾을 수 없다: ${wanted}`);
  return b;
}

// "마태복음 24:14" · "마태복음 28:19-20" · "열왕기상 6:37-7:1" 세 형태를 모두 받는다
export function parseRange(index, text) {
  const m = String(text).trim().match(/^(.+?)\s+(\d+):(\d+)(?:\s*-\s*(?:(\d+):)?(\d+))?$/);
  if (!m) throw new Error(`성구 형식을 해석할 수 없다: ${text}`);
  const b = findBook(index, m[1]);
  const fromChapter = Number(m[2]);
  const fromVerse = Number(m[3]);
  const toChapter = m[4] === undefined ? fromChapter : Number(m[4]);
  const toVerse = m[5] === undefined ? fromVerse : Number(m[5]);
  const fromId = toVerseId(index, b.num, fromChapter, fromVerse);
  const toId = toVerseId(index, b.num, toChapter, toVerse);
  if (toId < fromId) throw new Error(`범위가 거꾸로 됐다: ${text}`);
  return { book: b.num, title: b.title, fromChapter, fromVerse, toChapter, toVerse, fromId, toId };
}
