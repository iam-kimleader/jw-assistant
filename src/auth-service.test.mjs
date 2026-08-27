// 로그인 시작·완료와 초대 코드 확인 흐름을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 인증만들기 } from './auth-service.mjs';

const 설정 = {
  restApiKey: 'KEY',
  clientSecret: 'SECRET',
  redirectUri: 'http://localhost:3000/api/auth-callback',
  초대코드: '열려라',
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

test('처음 온 사람은 초대가 필요하다', async () => {
  const 결과 = await 만들기().로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '초대필요');
  assert.deepEqual(결과.신원, { 회원번호: '777', 닉네임: '동언' });
});

test('카카오가 실패하면 사유를 담아 거부한다', async () => {
  const 카카오 = { ...가짜카카오, 토큰받기: async () => { throw new Error('KOE006'); } };
  const 결과 = await 만들기(가짜저장소(), 카카오).로그인완료({
    code: 'CODE', state: 'STATE123', 저장된state: 'STATE123',
  });
  assert.equal(결과.결과, '거부');
  assert.match(결과.사유, /KOE006/);
});

test('초대 코드가 맞으면 승인 기록을 남긴다', async () => {
  const 저장소 = 가짜저장소();
  const 결과 = await 만들기(저장소).초대확인({
    코드: '열려라', 신원: { 회원번호: '777', 닉네임: '동언' },
  });
  assert.equal(결과.통과, true);
  assert.deepEqual(결과.사용자, { 회원번호: '777', 닉네임: '동언' });
  const 기록 = 저장소.담긴것.get('users/777/profile.json');
  assert.equal(기록.회원번호, '777');
  assert.equal(기록.닉네임, '동언');
  assert.equal(typeof 기록.승인된때, 'string');
});

test('초대 코드가 틀리면 기록을 남기지 않는다', async () => {
  const 저장소 = 가짜저장소();
  const 결과 = await 만들기(저장소).초대확인({
    코드: '틀림', 신원: { 회원번호: '777', 닉네임: '동언' },
  });
  assert.equal(결과.통과, false);
  assert.equal(저장소.담긴것.size, 0);
});

test('신원이 없으면 초대를 통과시키지 않는다', async () => {
  const 결과 = await 만들기().초대확인({ 코드: '열려라', 신원: null });
  assert.equal(결과.통과, false);
});

test('사용자 경로를 만든다', () => {
  assert.equal(만들기().사용자경로('777'), 'users/777/profile.json');
});
