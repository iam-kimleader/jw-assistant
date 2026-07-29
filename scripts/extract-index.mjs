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
