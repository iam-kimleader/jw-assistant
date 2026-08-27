// 환경 변수로 인증 설정을 조립하는 부분을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 설정읽기, 요청사용자, 세션쿠키이름 } from './auth-runtime.mjs';
import { 세션만들기, 쿠키만들기 } from './session.mjs';

function 환경으로(값들, 할일) {
  const 이전 = { ...process.env };
  Object.assign(process.env, 값들);
  try {
    return 할일();
  } finally {
    for (const k of Object.keys(process.env)) if (!(k in 이전)) delete process.env[k];
    Object.assign(process.env, 이전);
  }
}

test('환경 변수에서 설정을 읽는다', () => {
  const 설정 = 환경으로(
    {
      KAKAO_REST_API_KEY: 'KEY',
      KAKAO_CLIENT_SECRET: 'SECRET',
      SESSION_SECRET: 'SESSION',
      INVITE_CODE: '열려라',
      APP_BASE_URL: 'https://example.com',
    },
    설정읽기,
  );
  assert.equal(설정.restApiKey, 'KEY');
  assert.equal(설정.clientSecret, 'SECRET');
  assert.equal(설정.세션비밀, 'SESSION');
  assert.equal(설정.초대코드, '열려라');
  assert.equal(설정.redirectUri, 'https://example.com/api/auth-callback');
});

test('APP_BASE_URL 끝의 빗금을 지운다', () => {
  const 설정 = 환경으로({ APP_BASE_URL: 'https://example.com/' }, 설정읽기);
  assert.equal(설정.redirectUri, 'https://example.com/api/auth-callback');
});

test('Vercel 에서만 Secure 쿠키를 쓴다', () => {
  assert.equal(환경으로({ VERCEL: '1' }, 설정읽기).보안, true);
  assert.equal(환경으로({}, () => 설정읽기()).보안, false);
});

test('세션 쿠키에서 사용자를 꺼낸다', () => {
  환경으로({ SESSION_SECRET: 'SESSION' }, () => {
    const 값 = 세션만들기({ 회원번호: '7', 닉네임: '동언' }, 'SESSION');
    const 헤더 = 쿠키만들기(세션쿠키이름, 값, 60, { 보안: false }).split(';')[0];
    assert.deepEqual(요청사용자(헤더), { 회원번호: '7', 닉네임: '동언' });
    assert.equal(요청사용자('없음=1'), null);
    assert.equal(요청사용자(undefined), null);
  });
});
