// 세션 쿠키의 서명과 검증을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 세션만들기, 세션읽기, 쿠키만들기, 쿠키읽기, 쿠키지우기 } from './session.mjs';

const 비밀 = 'test-secret-do-not-use';
const 사용자 = { 회원번호: '1234567890', 닉네임: '동언' };
const 지금 = 1_700_000_000_000;

test('만든 세션을 그대로 읽는다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금);
  assert.deepEqual(세션읽기(값, 비밀, 지금 + 1_000), 사용자);
});

test('본문을 고치면 서명이 깨져 거부한다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금);
  const [본문, 서명] = 값.split('.');
  const 위조본문 = Buffer.from(
    JSON.stringify({ 회원번호: '9999', 닉네임: '남', 만료: 지금 + 999_999 }),
    'utf8',
  ).toString('base64url');
  assert.equal(세션읽기(`${위조본문}.${서명}`, 비밀, 지금), null);
  assert.notEqual(본문, 위조본문);
});

test('다른 비밀로 서명한 값은 거부한다', () => {
  const 값 = 세션만들기(사용자, '다른비밀', 지금);
  assert.equal(세션읽기(값, 비밀, 지금), null);
});

test('만료된 세션은 거부한다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금, 60);
  assert.deepEqual(세션읽기(값, 비밀, 지금 + 59_000), 사용자);
  assert.equal(세션읽기(값, 비밀, 지금 + 61_000), null);
});

test('만료는 발급 시점 기준이고 읽어도 늘지 않는다', () => {
  const 값 = 세션만들기(사용자, 비밀, 지금, 100);
  세션읽기(값, 비밀, 지금 + 50_000);
  assert.equal(세션읽기(값, 비밀, 지금 + 101_000), null);
});

test('모양이 아닌 값은 조용히 거부한다', () => {
  for (const 값 of [null, undefined, '', '점없음', '.', 'a.b', 'a.b.c', 'ÿ'.repeat(43)]) {
    assert.equal(세션읽기(값, 비밀, 지금), null);
  }
});

test('신원 토큰을 세션으로 읽으면 거부한다', () => {
  const 신원토큰 = 세션만들기(사용자, 비밀, 지금, 600, '신원');
  assert.equal(세션읽기(신원토큰, 비밀, 지금), null);
  assert.deepEqual(세션읽기(신원토큰, 비밀, 지금, '신원'), 사용자);
});

test('세션 토큰을 신원으로 읽으면 거부한다', () => {
  const 세션토큰 = 세션만들기(사용자, 비밀, 지금);
  assert.equal(세션읽기(세션토큰, 비밀, 지금, '신원'), null);
});

test('쿠키 헤더를 만든다', () => {
  const 헤더 = 쿠키만들기('세션', 'abc', 60, { 보안: true });
  assert.match(헤더, /^세션=abc;/);
  assert.match(헤더, /HttpOnly/);
  assert.match(헤더, /SameSite=Lax/);
  assert.match(헤더, /Path=\//);
  assert.match(헤더, /Max-Age=60/);
  assert.match(헤더, /Secure/);
});

test('로컬에서는 Secure 를 빼서 http 로도 오간다', () => {
  assert.doesNotMatch(쿠키만들기('세션', 'abc', 60, { 보안: false }), /Secure/);
});

test('쿠키 헤더에서 이름으로 값을 찾는다', () => {
  const 헤더 = '가=1; 세션=abc.def; 나=2';
  assert.equal(쿠키읽기(헤더, '세션'), 'abc.def');
  assert.equal(쿠키읽기(헤더, '없음'), null);
  assert.equal(쿠키읽기(undefined, '세션'), null);
});

test('값에 등호가 있어도 끝까지 읽는다', () => {
  assert.equal(쿠키읽기('세션=a=b=c', '세션'), 'a=b=c');
});

test('지우는 쿠키는 Max-Age 가 0 이다', () => {
  assert.match(쿠키지우기('세션', { 보안: true }), /Max-Age=0/);
});
