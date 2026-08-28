// 저장 경로 만들기와 모양 검사를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 주간열쇠, 주간경로, 설정경로, 연설경로 } from './storage-paths.mjs';

test('같은 주의 어느 날을 넣어도 한 열쇠로 모인다', () => {
  for (const 날 of ['2026-08-24', '2026-08-27', '2026-08-30']) {
    assert.equal(주간열쇠(날), '2026-08-24');
  }
  assert.equal(주간열쇠('2026-08-31'), '2026-08-31');
});

test('날짜 모양이 아니면 던진다', () => {
  for (const 값 of [null, undefined, '', '2026-8-24', '20260824', '오늘', '2026-08-24T00:00:00Z']) {
    assert.throws(() => 주간열쇠(값), /날짜/);
  }
});

test('달력에 없는 날짜는 던진다', () => {
  assert.throws(() => 주간열쇠('2026-13-01'), /날짜/);
  assert.throws(() => 주간열쇠('2026-02-30'), /날짜/);
});

test('주간 경로는 종류별로 갈린다', () => {
  assert.equal(주간경로('watchtower', '2026-08-27'), 'weeks/watchtower/2026-08-24.json');
  assert.equal(주간경로('life-ministry', '2026-08-27'), 'weeks/life-ministry/2026-08-24.json');
});

test('모르는 종류는 던진다', () => {
  assert.throws(() => 주간경로('마음대로', '2026-08-24'), /종류/);
  assert.throws(() => 주간경로('../etc', '2026-08-24'), /종류/);
});

test('설정 경로를 만든다', () => {
  assert.equal(설정경로('777'), 'users/777/profile.json');
});

test('연설 경로를 만든다', () => {
  assert.equal(연설경로('777', '2026-08-27', 3), 'users/777/talks/2026-08-24-3.json');
});

test('회원번호가 숫자 모양이 아니면 던진다', () => {
  for (const 값 of ['777/../888', '../etc', '', 'abc', '7 7']) {
    assert.throws(() => 설정경로(값), /회원번호/);
    assert.throws(() => 연설경로(값, '2026-08-24', 0), /회원번호/);
  }
});

test('배정번호가 정수가 아니면 던진다', () => {
  for (const 값 of ['0', 1.5, -1, NaN, null, undefined, '../x']) {
    assert.throws(() => 연설경로('777', '2026-08-24', 값), /배정번호/);
  }
});

test('배정번호는 한 주 배정 수를 넘지 않는다', () => {
  assert.equal(연설경로('777', '2026-08-24', 0), 'users/777/talks/2026-08-24-0.json');
  assert.throws(() => 연설경로('777', '2026-08-24', 100), /배정번호/);
});
