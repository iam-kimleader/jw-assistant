// 보관함 목록을 만드는 로직을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 주간경로파싱, 연설경로파싱, 보관목록 } from './archive.mjs';

function 가짜저장소(초기 = {}) {
  const 담긴것 = new Map(Object.entries(초기));
  return {
    담긴것,
    async 읽기(경로) { return 담긴것.get(경로) ?? null; },
    async 쓰기(경로, 내용) { 담긴것.set(경로, 내용); },
    async 목록(접두사) { return [...담긴것.keys()].filter(x => x.startsWith(접두사 ?? '')); },
    async 지우기(경로) { 담긴것.delete(경로); },
  };
}

test('주간 경로를 종류와 주간으로 나눈다', () => {
  assert.deepEqual(주간경로파싱('weeks/watchtower/2026-08-24.json'), {
    종류: 'watchtower', 주간: '2026-08-24',
  });
  assert.deepEqual(주간경로파싱('weeks/life-ministry/2026-08-24.json'), {
    종류: 'life-ministry', 주간: '2026-08-24',
  });
});

test('모양이 다른 주간 경로는 null 이다', () => {
  // 저장소에 예상 밖의 이름이 있어도 목록 전체가 죽으면 안 된다.
  assert.equal(주간경로파싱('weeks/other/2026-08-24.json'), null);
  assert.equal(주간경로파싱('weeks/watchtower/index.json'), null);
  assert.equal(주간경로파싱('weeks/watchtower/2026-08-24.json.bak'), null);
  assert.equal(주간경로파싱(null), null);
});

test('연설 경로를 회원번호·주간·배정번호로 나눈다', () => {
  assert.deepEqual(연설경로파싱('users/777/talks/2026-08-24-3.json'), {
    회원번호: '777', 주간: '2026-08-24', 배정번호: 3,
  });
  assert.equal(연설경로파싱('users/777/profile.json'), null);
});

test('연구 답변은 최신 주간부터 주고 같은 주간이면 파수대가 먼저다', async () => {
  const 저장소 = 가짜저장소({
    'weeks/life-ministry/2026-08-24.json': { 자료: {} },
    'weeks/watchtower/2026-08-17.json': { 자료: {} },
    'weeks/watchtower/2026-08-24.json': { 자료: {} },
  });
  const { 연구답변 } = await 보관목록({ 저장소, 회원번호: '777' });
  assert.deepEqual(연구답변, [
    { 종류: 'watchtower', 주간: '2026-08-24' },
    { 종류: 'life-ministry', 주간: '2026-08-24' },
    { 종류: 'watchtower', 주간: '2026-08-17' },
  ]);
});

test('연설에는 제목과 만든 때가 붙고 주간 내림차순·배정번호 오름차순이다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/talks/2026-08-17-1.json': { 배정제목: '지난 주 연설', 만든때: '2026-08-17T00:00:00.000Z' },
    'users/777/talks/2026-08-24-3.json': { 배정제목: '보물 — 징계', 만든때: '2026-08-24T00:00:00.000Z' },
    'users/777/talks/2026-08-24-1.json': { 배정제목: '성경 낭독', 만든때: '2026-08-23T00:00:00.000Z' },
  });
  const { 연설 } = await 보관목록({ 저장소, 회원번호: '777' });
  assert.deepEqual(연설.map(x => [x.주간, x.배정번호, x.배정제목]), [
    ['2026-08-24', 1, '성경 낭독'],
    ['2026-08-24', 3, '보물 — 징계'],
    ['2026-08-17', 1, '지난 주 연설'],
  ]);
  assert.equal(연설[0].만든때, '2026-08-23T00:00:00.000Z');
});

test('남의 연설은 목록에 넣지 않는다', async () => {
  // 저장소가 접두사를 넓게 잡아 주더라도 남의 자료가 새어 나오면 안 된다.
  const 저장소 = 가짜저장소({
    'users/777/talks/2026-08-24-1.json': { 배정제목: '내 것', 만든때: null },
    'users/888/talks/2026-08-24-1.json': { 배정제목: '남의 것', 만든때: null },
  });
  저장소.목록 = async () => [...저장소.담긴것.keys()];
  const { 연설 } = await 보관목록({ 저장소, 회원번호: '777' });
  assert.deepEqual(연설.map(x => x.배정제목), ['내 것']);
});

test('읽히지 않는 연설 줄만 빼고 나머지를 준다', async () => {
  const 저장소 = 가짜저장소({
    'users/777/talks/2026-08-24-1.json': { 배정제목: '살아 있는 것', 만든때: null },
    'users/777/talks/2026-08-17-1.json': null,
  });
  const { 연설 } = await 보관목록({ 저장소, 회원번호: '777' });
  assert.deepEqual(연설.map(x => x.배정제목), ['살아 있는 것']);
});

test('목록 호출이 실패하면 빈 배열을 준다', async () => {
  // 보관함이 비어 보이는 것이 화면이 막히는 것보다 낫다.
  const 저장소 = 가짜저장소();
  저장소.목록 = async () => { throw new Error('저장소 고장'); };
  assert.deepEqual(await 보관목록({ 저장소, 회원번호: '777' }), { 연구답변: [], 연설: [] });
});

test('제목이 없는 옛 자료도 줄이 사라지지 않는다', async () => {
  const 저장소 = 가짜저장소({ 'users/777/talks/2026-08-24-1.json': { 만든때: null } });
  const { 연설 } = await 보관목록({ 저장소, 회원번호: '777' });
  assert.deepEqual(연설, [{ 주간: '2026-08-24', 배정번호: 1, 배정제목: '', 만든때: null }]);
});

test('회원번호가 숫자 모양이 아니면 던진다', async () => {
  await assert.rejects(() => 보관목록({ 저장소: 가짜저장소(), 회원번호: '../etc' }));
});
