// 세션 없는 요청을 막는 가드를 검증하는 테스트
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { 가드 } from './api-guard.mjs';
import { 세션만들기 } from './session.mjs';
import { 세션쿠키이름 } from './auth-runtime.mjs';

// 설정읽기 가 통과하려면 최소 32자 SESSION_SECRET 과 카카오 열쇠 둘이 있어야 한다.
// 요청사용자 를 거치는 가드 시험 전체에 필요하므로 파일 전체에 걸어 둔다.
const 유효한비밀 = 'x'.repeat(32);
const 갖춘환경 = {
  SESSION_SECRET: 유효한비밀,
  KAKAO_REST_API_KEY: 'KEY',
  KAKAO_CLIENT_SECRET: 'SECRET',
};
const 이전환경 = {};

before(() => {
  for (const [k, v] of Object.entries(갖춘환경)) {
    이전환경[k] = process.env[k];
    process.env[k] = v;
  }
});

after(() => {
  for (const [k, v] of Object.entries(이전환경)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
});

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
  const 값 = 세션만들기({ 회원번호: '7', 닉네임: '동언' }, 유효한비밀);
  const req = { headers: { cookie: `${세션쿠키이름}=${값}` } };
  let 본사용자 = null;
  await 가드(async r => { 본사용자 = r.사용자; })(req, 가짜응답());
  assert.deepEqual(본사용자, { 회원번호: '7', 닉네임: '동언' });
});
