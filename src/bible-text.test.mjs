// 절 본문 읽기가 실제 파일 내용과 일치하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';

const skip = !existsSync('core/bible/text/40-마태복음.md');
const idx = skip ? null : loadIndex();
const reader = skip ? null : createTextReader(idx);

test('일반 성구의 본문을 읽는다', { skip }, () => {
  assert.equal(
    reader.verse(40, 24, 13),
    '그러나 끝까지 인내하는 사람은 구원을 받을 것입니다.'
  );
});

test('시편 표제 0절의 본문을 읽는다', { skip }, () => {
  assert.equal(reader.verse(19, 3, 0), '다윗의 시가. 아들 압살롬을 피해 도망할 때');
});

test('요한복음 8장은 12절부터 읽힌다', { skip }, () => {
  assert.ok(reader.verse(43, 8, 12).startsWith('예수께서 다시 그들에게 말씀하셨다.'));
  assert.equal(reader.verse(43, 8, 11), null);
});

test('없는 절은 null 을 준다', { skip }, () => {
  assert.equal(reader.verse(40, 24, 99), null);
});

test('같은 권을 여러 번 읽어도 결과가 같다', { skip }, () => {
  const a = reader.verse(66, 22, 21);
  const b = reader.verse(66, 22, 21);
  assert.equal(a, b);
  assert.ok(a.length > 0);
});
