// 성구 범위 문자열 해석이 정확한지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex, parseRange } from './verse-address.mjs';

const skip = !existsSync('core/bible/index.json');
const idx = skip ? null : loadIndex();

test('단일 성구는 시작과 끝이 같다', { skip }, () => {
  const r = parseRange(idx, '마태복음 24:14');
  assert.equal(r.book, 40);
  assert.equal(r.title, '마태복음');
  assert.equal(r.fromId, 24087);
  assert.equal(r.toId, 24087);
  assert.deepEqual([r.fromChapter, r.fromVerse, r.toChapter, r.toVerse], [24, 14, 24, 14]);
});

test('같은 장 안의 범위를 해석한다', { skip }, () => {
  const r = parseRange(idx, '마태복음 28:19-20');
  assert.equal(r.fromChapter, 28);
  assert.equal(r.fromVerse, 19);
  assert.equal(r.toChapter, 28);
  assert.equal(r.toVerse, 20);
  assert.equal(r.toId - r.fromId, 1);
});

test('장을 넘어가는 범위를 해석한다', { skip }, () => {
  const r = parseRange(idx, '열왕기상 6:37-7:1');
  assert.equal(r.book, 11);
  assert.equal(r.fromChapter, 6);
  assert.equal(r.fromVerse, 37);
  assert.equal(r.toChapter, 7);
  assert.equal(r.toVerse, 1);
  assert.ok(r.toId > r.fromId);
});

test('공백과 숫자를 포함한 권명도 해석한다', { skip }, () => {
  assert.equal(parseRange(idx, '요한 1서 2:5').book, 62);
  assert.equal(parseRange(idx, '고린도 전서 9:16').book, 46);
  assert.equal(parseRange(idx, '요한 계시록 22:21').toId, 31193);
});

test('시편 표제 0절도 범위에 들어온다', { skip }, () => {
  const r = parseRange(idx, '시편 3:0-3');
  assert.equal(r.fromVerse, 0);
  assert.equal(r.toVerse, 3);
  assert.equal(r.fromId, 13958);
});

test('거꾸로 된 범위와 범위 밖 성구는 오류를 던진다', { skip }, () => {
  assert.throws(() => parseRange(idx, '마태복음 24:16-14'), /거꾸로/);
  assert.throws(() => parseRange(idx, '마태복음 24:52'), /범위/);
  assert.throws(() => parseRange(idx, '요한복음 8:11'), /범위/);
  assert.throws(() => parseRange(idx, '없는책 1:1'), /권을 찾을 수 없다/);
  assert.throws(() => parseRange(idx, '마태복음 24장'), /해석할 수 없다/);
});
