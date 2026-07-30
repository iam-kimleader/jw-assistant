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
  // 공백과 내장 숫자를 모두 포함하는 권명 회귀 테스트
  assert.deepEqual(parseReference(idx, '요한 1서 2:5'), { book: 62, chapter: 2, verse: 5 });
  assert.deepEqual(parseReference(idx, '요한 2서 1:3'), { book: 63, chapter: 1, verse: 3 });
  assert.deepEqual(parseReference(idx, '요한 3서 1:14'), { book: 64, chapter: 1, verse: 14 });
});

test('범위를 벗어나면 오류를 던진다', { skip }, () => {
  assert.throws(() => toAddress(idx, -1), /범위/);
  assert.throws(() => toAddress(idx, 31194), /범위/);
  assert.throws(() => toVerseId(idx, 40, 24, 52), /범위/);
  assert.throws(() => parseReference(idx, '없는책 1:1'), /권을 찾을 수 없다/);
});
