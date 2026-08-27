// 주간 자료의 캐시 판단을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 주간자료가져오기 } from './week-cache.mjs';

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

function 세는만들기(값 = { title: '새로 만든 것' }) {
  const 부른것 = [];
  const 만들기 = async 주간 => {
    부른것.push(주간);
    return 값;
  };
  return { 만들기, 부른것 };
}

const 지금 = () => 1_800_000_000_000;

test('저장된 게 없으면 만들고 저장한다', async () => {
  const 저장소 = 가짜저장소();
  const { 만들기, 부른것 } = 세는만들기();
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 지금,
  });

  assert.deepEqual(결과.자료, { title: '새로 만든 것' });
  assert.equal(결과.새로만듦, true);
  assert.equal(결과.만든때, new Date(지금()).toISOString());
  // 만들기 는 화면이 보낸 날짜가 아니라 정규화된 주간을 받아야 한다.
  assert.deepEqual(부른것, ['2026-08-24']);
  assert.deepEqual(저장소.담긴것.get('weeks/watchtower/2026-08-24.json'), {
    자료: { title: '새로 만든 것' },
    만든때: new Date(지금()).toISOString(),
  });
});

test('저장된 게 있으면 만들지 않는다', async () => {
  const 저장소 = 가짜저장소({
    'weeks/watchtower/2026-08-24.json': { 판: 1, 자료: { title: '옛것' }, 만든때: '2026-08-25T00:00:00.000Z' },
  });
  const { 만들기, 부른것 } = 세는만들기();
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 지금,
  });

  assert.deepEqual(결과.자료, { title: '옛것' });
  assert.equal(결과.새로만듦, false);
  assert.equal(결과.만든때, '2026-08-25T00:00:00.000Z');
  assert.deepEqual(부른것, []);
});

test('같은 주의 다른 날짜도 저장된 것을 찾는다', async () => {
  const 저장소 = 가짜저장소({
    'weeks/watchtower/2026-08-24.json': { 판: 1, 자료: { title: '옛것' }, 만든때: '2026-08-25T00:00:00.000Z' },
  });
  const { 만들기, 부른것 } = 세는만들기();
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-30', 저장소, 만들기, 지금,
  });
  assert.equal(결과.새로만듦, false);
  assert.deepEqual(부른것, []);
});

test('다시 만들기는 저장된 게 있어도 새로 만든다', async () => {
  const 저장소 = 가짜저장소({
    'weeks/watchtower/2026-08-24.json': { 판: 1, 자료: { title: '옛것' }, 만든때: '2026-08-25T00:00:00.000Z' },
  });
  const { 만들기, 부른것 } = 세는만들기({ title: '다시 만든 것' });
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 다시만들기: true, 지금,
  });

  assert.deepEqual(결과.자료, { title: '다시 만든 것' });
  assert.equal(결과.새로만듦, true);
  assert.deepEqual(부른것, ['2026-08-24']);
  assert.deepEqual(저장소.담긴것.get('weeks/watchtower/2026-08-24.json').자료, { title: '다시 만든 것' });
});

test('종류가 갈리면 서로 덮지 않는다', async () => {
  const 저장소 = 가짜저장소();
  await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-24', 저장소, 만들기: 세는만들기({ 어느것: '파수대' }).만들기, 지금,
  });
  await 주간자료가져오기({
    종류: 'life-ministry', 날짜: '2026-08-24', 저장소, 만들기: 세는만들기({ 어느것: '생활과 봉사' }).만들기, 지금,
  });
  assert.deepEqual(저장소.담긴것.get('weeks/watchtower/2026-08-24.json').자료, { 어느것: '파수대' });
  assert.deepEqual(저장소.담긴것.get('weeks/life-ministry/2026-08-24.json').자료, { 어느것: '생활과 봉사' });
});

test('저장이 실패해도 만든 것을 돌려준다', async () => {
  const 저장소 = 가짜저장소();
  저장소.쓰기 = async () => {
    throw new Error('저장소가 없다');
  };
  const { 만들기 } = 세는만들기();
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 지금,
  });
  // OpenAI 호출이 이미 끝나 돈이 나갔다. 저장 실패로 그것을 잃게 하지 않는다.
  assert.deepEqual(결과.자료, { title: '새로 만든 것' });
  assert.equal(결과.새로만듦, true);
});

test('읽기가 실패하면 없는 것으로 보고 만든다', async () => {
  const 저장소 = 가짜저장소();
  저장소.읽기 = async () => {
    throw new Error('저장소가 없다');
  };
  const { 만들기, 부른것 } = 세는만들기();
  const 결과 = await 주간자료가져오기({
    종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 지금,
  });
  assert.equal(결과.새로만듦, true);
  assert.deepEqual(부른것, ['2026-08-24']);
});

test('만들기가 실패하면 그대로 던진다', async () => {
  const 저장소 = 가짜저장소();
  const 만들기 = async () => {
    throw new Error('WOL 을 읽지 못했다');
  };
  // 자료를 못 만든 것은 삼키면 안 된다. 화면이 무엇이 잘못됐는지 알려야 한다.
  await assert.rejects(
    () => 주간자료가져오기({ 종류: 'watchtower', 날짜: '2026-08-27', 저장소, 만들기, 지금 }),
    /WOL/);
});

test('날짜가 모양에 안 맞으면 만들기를 부르지 않고 던진다', async () => {
  const { 만들기, 부른것 } = 세는만들기();
  await assert.rejects(
    () => 주간자료가져오기({ 종류: 'watchtower', 날짜: '오늘', 저장소: 가짜저장소(), 만들기, 지금 }),
    /날짜/);
  assert.deepEqual(부른것, []);
});
