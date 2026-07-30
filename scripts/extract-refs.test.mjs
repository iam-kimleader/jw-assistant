// 상호 참조 추출 결과가 올바른 형식과 내용을 갖는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const FILE = 'core/bible/refs/40-마태복음.tsv';
const skip = !existsSync(FILE);
const lines = skip ? [] : readFileSync(FILE, 'utf8').split('\n').filter(Boolean);

test('모든 줄이 장:절 과 참조 목록으로 이루어진다', { skip }, () => {
  for (const line of lines) {
    assert.match(line, /^\d+:\d+\t.+$/, `형식이 틀린 줄: ${line}`);
  }
});

test('마태복음 24:14 의 참조가 7건이다', { skip }, () => {
  const line = lines.find(l => l.startsWith('24:14\t'));
  assert.ok(line, '24:14 줄이 없다');
  const refs = line.split('\t')[1].split(', ');
  assert.equal(refs.length, 7);
  // 참조는 단일 절(`책 1:1`)이거나 범위(`책 1:1-2`, 장이 걸치면 `책 1:1-2:1`)일 수 있다
  assert.ok(refs.every(r => /^.+ \d+:\d+(-\d+(:\d+)?)?$/.test(r)), `주소 형식이 아닌 참조가 있다: ${refs}`);
});

test('전체 참조 줄 수가 0보다 많다', { skip }, () => {
  assert.ok(lines.length > 0);
});
