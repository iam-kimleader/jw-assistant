// 카카오 로그인 엔드포인트 호출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 인가주소, 토큰받기, 사용자정보 } from './kakao-auth.mjs';

const 설정 = {
  restApiKey: 'KEY',
  clientSecret: 'SECRET',
  redirectUri: 'http://localhost:3000/api/auth-callback',
};

function 가짜응답(본문, ok = true) {
  return { ok, async json() { return 본문; } };
}

test('인가 주소에 필요한 값이 모두 들어간다', () => {
  const 주소 = new URL(인가주소(설정, 'STATE123'));
  assert.equal(주소.origin + 주소.pathname, 'https://kauth.kakao.com/oauth/authorize');
  assert.equal(주소.searchParams.get('client_id'), 'KEY');
  assert.equal(주소.searchParams.get('redirect_uri'), 설정.redirectUri);
  assert.equal(주소.searchParams.get('response_type'), 'code');
  assert.equal(주소.searchParams.get('state'), 'STATE123');
});

test('인가 주소에 client_secret 을 넣지 않는다', () => {
  assert.doesNotMatch(인가주소(설정, 'S'), /SECRET/);
});

test('토큰을 받는다', async () => {
  let 부른것 = null;
  const 가짜fetch = async (주소, 설정값) => {
    부른것 = { 주소, 설정값 };
    return 가짜응답({ access_token: 'TOKEN' });
  };
  assert.equal(await 토큰받기(설정, 'CODE', 가짜fetch), 'TOKEN');
  assert.equal(부른것.주소, 'https://kauth.kakao.com/oauth/token');
  assert.equal(부른것.설정값.method, 'POST');
  const 몸 = new URLSearchParams(부른것.설정값.body);
  assert.equal(몸.get('grant_type'), 'authorization_code');
  assert.equal(몸.get('client_id'), 'KEY');
  assert.equal(몸.get('client_secret'), 'SECRET');
  assert.equal(몸.get('redirect_uri'), 설정.redirectUri);
  assert.equal(몸.get('code'), 'CODE');
});

test('토큰 오류는 카카오가 준 코드를 담아 던진다', async () => {
  const 가짜fetch = async () =>
    가짜응답({ error: 'invalid_grant', error_code: 'KOE320' }, false);
  await assert.rejects(() => 토큰받기(설정, 'CODE', 가짜fetch), /KOE320/);
});

test('토큰이 없으면 던진다', async () => {
  const 가짜fetch = async () => 가짜응답({});
  await assert.rejects(() => 토큰받기(설정, 'CODE', 가짜fetch));
});

test('사용자 정보에서 회원번호와 닉네임을 뽑는다', async () => {
  let 부른것 = null;
  const 가짜fetch = async (주소, 설정값) => {
    부른것 = { 주소, 설정값 };
    return 가짜응답({ id: 1234567890, properties: { nickname: '동언' } });
  };
  assert.deepEqual(await 사용자정보('TOKEN', 가짜fetch), {
    회원번호: '1234567890',
    닉네임: '동언',
  });
  assert.equal(부른것.주소, 'https://kapi.kakao.com/v2/user/me');
  assert.equal(부른것.설정값.headers.Authorization, 'Bearer TOKEN');
});

test('닉네임 동의를 안 했으면 빈 문자열로 둔다', async () => {
  const 가짜fetch = async () => 가짜응답({ id: 7 });
  assert.deepEqual(await 사용자정보('T', 가짜fetch), { 회원번호: '7', 닉네임: '' });
});

test('사용자 정보 오류는 던진다', async () => {
  const 가짜fetch = async () => 가짜응답({ msg: '만료', code: -401 }, false);
  await assert.rejects(() => 사용자정보('T', 가짜fetch));
});
