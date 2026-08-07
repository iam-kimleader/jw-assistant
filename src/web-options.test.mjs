// 웹 날짜 옵션 생성 규칙을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeekOptions, weekEnd } from './web-options.mjs';

test('주 종료일을 계산한다', () => {
  assert.equal(weekEnd('2026-08-03'), '2026-08-09');
});

test('이전 10주와 이후 10주를 만든다', () => {
  const options = buildWeekOptions(new Date('2026-08-07T00:00:00Z'));
  assert.equal(options.length, 21);
  assert.equal(options[0].value, '2026-05-25');
  assert.equal(options[10].value, '2026-08-03');
  assert.equal(options[20].value, '2026-10-12');
  assert.equal(options.filter(o => o.current).length, 1);
});
