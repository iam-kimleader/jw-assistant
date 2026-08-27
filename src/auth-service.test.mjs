// 로그인 시작·완료 흐름을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 인증만들기 } from './auth-service.mjs';

const 설정 = {
  restApiKey: 'KEY',
  clientSecret: 'SECRET',
  redirectUri: 'http://localhost:3000/api/auth-callback',
};

function 가짜저장소(초기 = {}) {
  const 담긴것 = new Map(Object.entries(초기));
  return {
    담긴것,
    async 읽기(경로) { return 담긴것.get(경로) ?? null; },
    async 쓰기(경로, 내용) { 담긴것.set(경로, 내용); },
    async 목록() { return [...담긴것.keys()]; },
    async 지우기(경로) { 담긴것.delete(경로); },
  };
}

const 가짜카카오 = {
  인가주소: (_설정, state) => `https://kauth.example/authorize?state=${state}`,
  토큰받기: async () => 'TOKEN',
  사용자정보: async () => ({ 회원번호: '777', 닉네임: '동언' }),
};

function 만들기(저장소 = 가짜저장소(), 카카오 = 가짜카카오) {
  return 인증만들기({ 설정, 카카오, 저장소, 무작위: () => 'STATE123', 지금: () => 1_000 });
}

test('로그인 시작이 state 와 카카오 주소를 준다', () => {
  const { 위치, state } = 만들기().로그인시작();
  assert.equal(state, 'STATE123');
  assert.match(위치, /state=STATE123/);
});

test('state 가 다르면 거부한다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: '다름', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '거부');
});

test('state 가 없으면 거부한다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: null, 저장된state: null,
  });
  assert.equal(결과.결과, '거부');
});

test('승인된 사람은 바로 들어온다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/profile.json': { 회원번호: '777', 닉네임: '동언' },
  });
  const 결과 = await 만들기(저장소).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '승인');
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
});

test('처음 온 사람도 바로 들어오고 프로필이 남는다', async () => {
  const 저장소 = 가짜저장소();
  const 결과 = await 만들기(저장소).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '승인');
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
  const 기록 = 저장소.담긴것.get('users/777/profile.json');
  assert.equal(기록.회원번호, '777');
  assert.equal(기록.닉네임, '동언');
  assert.equal(typeof 기록.첫로그인때, 'string');
});

test('카카오가 로그인을 거절하면 그 사유를 그대로 담는다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: null, state: 'STATE123', 저장된state: 'STATE123',
    오류: 'access_denied', 오류설명: '사용자가 취소했습니다',
  });
  assert.equal(결과.결과, '거부');
  assert.match(결과.사유, /access_denied/);
  assert.match(결과.사유, /사용자가 취소했습니다/);
});

test('카카오가 실패하면 사유를 담아 거부한다', async () => {
  const 카카오 = { ...가짜카카오, 토큰받기: async () => { throw new Error('KOE006'); } };
  const 결과 = await 만들기(가짜저장소(), 카카오).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '거부');
  assert.match(결과.사유, /KOE006/);
});

test('프로필 쓰기가 실패해도 로그인은 막지 않는다', async () => {
  const 저장소 = 가짜저장소();
  저장소.쓰기 = async () => { throw new Error('망가짐'); };
  const 결과 = await 만들기(저장소).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '승인');
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
});

test('사용자 경로를 만든다', () => {
  assert.equal(만들기().사용자경로('777'), 'users/777/profile.json');
});

test('회원번호가 숫자 모양이 아니면 사용자경로가 거부한다', () => {
  assert.throws(() => 만들기().사용자경로('777/../etc'));
});

test('설정이 없으면 기본값을 준다', async () => {
  const 인증 = 만들기(가짜저장소());
  const 설정 = await 인증.설정읽기('777');
  assert.equal(설정.성별, '형제');
  assert.equal(설정.연령, 35);
  assert.equal(설정.임명, '미임명');
});

test('저장된 설정을 기본값 위에 얹는다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/profile.json': { 회원번호: '777', 닉네임: '동언', 설정: { 임명: '장로' } },
  });
  const 설정 = await 만들기(저장소).설정읽기('777');
  assert.equal(설정.임명, '장로');
  // 저장할 때 없던 항목은 기본값으로 채워야 화면이 빈칸을 그리지 않는다.
  assert.equal(설정.성별, '형제');
  assert.equal(설정.분당글자수, 320);
});

test('설정을 저장해도 닉네임이 지워지지 않는다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/profile.json': { 회원번호: '777', 닉네임: '동언', 승인된때: '2026-08-27T00:00:00.000Z' },
  });
  await 만들기(저장소).설정쓰기('777', { 임명: '장로', 연령: 40 });
  const 기록 = 저장소.담긴것.get('users/777/profile.json');
  assert.equal(기록.닉네임, '동언');
  assert.equal(기록.승인된때, '2026-08-27T00:00:00.000Z');
  assert.equal(기록.설정.임명, '장로');
  assert.equal(기록.설정.연령, 40);
});

test('설정에 모르는 항목을 넣으면 버린다', async () => {
  const 저장소 = 가짜저장소();
  await 만들기(저장소).설정쓰기('777', { 임명: '장로', 회원번호: '999', 아무거나: 1 });
  const 담긴설정 = 저장소.담긴것.get('users/777/profile.json').설정;
  assert.equal(담긴설정.임명, '장로');
  assert.equal('회원번호' in 담긴설정, false);
  assert.equal('아무거나' in 담긴설정, false);
});

test('설정 저장이 실패하면 던진다', async () => {
  const 저장소 = 가짜저장소();
  저장소.쓰기 = async () => {
    throw new Error('저장소가 없다');
  };
  // 형제가 직접 누른 동작이다. 조용히 넘기면 저장된 줄 알고 나간다.
  await assert.rejects(() => 만들기(저장소).설정쓰기('777', { 임명: '장로' }));
});
