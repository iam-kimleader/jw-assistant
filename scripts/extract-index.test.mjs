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
