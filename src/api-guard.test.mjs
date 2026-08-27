// 세션 없는 요청을 막는 가드를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 가드 } from './api-guard.mjs';
import { 세션만들기 } from './session.mjs';
import { 세션쿠키이름 } from './auth-runtime.mjs';

function 가짜응답() {
  return {
    코드: null, 몸: null,
    status(c) { this.코드 = c; return this; },
    json(b) { this.몸 = b; return this; },
  };
}

test('세션이 없으면 401 이고 안쪽 핸들러를 부르지 않는다', async () => {
  let 불렸나 = false;
  const 감싼것 = 가드(async () => { 불렸나 = true; });
  const res = 가짜응답();
  await 감싼것({ headers: {} }, res);
  assert.equal(res.코드, 401);
  assert.equal(불렸나, false);
});

test('망가진 세션도 401 이다', async () => {
  const res = 가짜응답();
  await 가드(async () => {})({ headers: { cookie: `${세션쿠키이름}=엉터리` } }, res);
  assert.equal(res.코드, 401);
});

test('세션이 있으면 통과시키고 사용자를 얹는다', async () => {
  const 이전 = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = 'SESSION';
  try {
    const 값 = 세션만들기({ 회원번호: '7', 닉네임: '동언' }, 'SESSION');
    const req = { headers: { cookie: `${세션쿠키이름}=${값}` } };
    let 본사용자 = null;
    await 가드(async r => { 본사용자 = r.사용자; })(req, 가짜응답());
    assert.deepEqual(본사용자, { 회원번호: '7', 닉네임: '동언' });
  } finally {
    if (이전 === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = 이전;
  }
});
