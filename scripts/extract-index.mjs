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
// BibleVerse.Label 은 HTML 이 섞여 있으므로 태그를 걷어내고 숫자만 본다
const labelRows = db.prepare(
  'SELECT BibleVerseId id, Label FROM BibleVerse ORDER BY BibleVerseId'
).all();
db.close();

const labelOf = new Map(
  labelRows.map(r => [r.id, String(r.Label ?? '').replace(/<[^>]*>/g, '').trim()])
);

// 장의 첫 절 번호는 첫 행의 Label 로 알 수 없다 — 시편 표제는 라벨이 비어 있고,
// 그 밖의 장은 첫 행에 장 번호가 표시 관례상 찍히기 때문이다. 대신 마지막 행의
// Label 은 언제나 진짜 절 번호이므로 거기서 역산한다.
function firstVerseNumberOf(chapter) {
  const rows = chapter.lastVerseId - chapter.firstVerseId + 1;
  const last = labelOf.get(chapter.lastVerseId);
  if (!/^\d+$/.test(last)) {
    throw new Error(`마지막 절의 라벨이 숫자가 아니다: id ${chapter.lastVerseId} = ${JSON.stringify(last)}`);
  }
  return Number(last) - (rows - 1);
}

const books = bookRows.map(b => ({
  num: b.num,
  title: b.title,
  slug: `${String(b.num).padStart(2, '0')}-${b.title.replace(/\s+/g, '')}`,
  firstVerseId: b.FirstVerseId,
  lastVerseId: b.LastVerseId,
  chapters: chapterRows
    .filter(c => c.BookNumber === b.num)
    .map(c => {
      const chapter = {
        num: c.ChapterNumber,
        firstVerseId: c.FirstVerseId,
        lastVerseId: c.LastVerseId,
        verses: c.LastVerseId - c.FirstVerseId + 1,
      };
      chapter.firstVerseNumber = firstVerseNumberOf(chapter);
      chapter.lastVerseNumber = chapter.firstVerseNumber + chapter.verses - 1;
      return chapter;
    }),
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
