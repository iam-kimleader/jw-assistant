// Blob 저장소 감싸기의 판 번호 확인과 오류 견딤을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 저장소만들기, 현재판 } from './store.mjs';

function 가짜blob(초기 = {}) {
  const 담긴것 = new Map(Object.entries(초기));
  return {
    담긴것,
    부른것: [],
    async put(경로, 본문, 설정) {
      this.부른것.push({ 이름: 'put', 경로, 설정 });
      담긴것.set(경로, 본문);
    },
    async get(경로, 설정) {
      this.부른것.push({ 이름: 'get', 경로, 설정 });
      if (!담긴것.has(경로)) return null;
      return { stream: new Response(담긴것.get(경로)).body };
    },
    async list({ prefix }) {
      return {
        blobs: [...담긴것.keys()]
          .filter(k => k.startsWith(prefix))
          .map(pathname => ({ pathname })),
        hasMore: false,
      };
    },
    async del(경로) {
      this.부른것.push({ 이름: 'del', 경로 });
      담긴것.delete(경로);
    },
  };
}

test('쓴 것을 그대로 읽는다', async () => {
  const blob = 가짜blob();
  const 저장소 = 저장소만들기(blob);
  await 저장소.쓰기('users/1/profile.json', { 닉네임: '동언' });
  assert.deepEqual(await 저장소.읽기('users/1/profile.json'), {
    판: 현재판,
    닉네임: '동언',
  });
});

test('쓸 때 판 번호를 붙이고 비공개로 덮어쓰기를 허용한다', async () => {
  const blob = 가짜blob();
  await 저장소만들기(blob).쓰기('가.json', { 값: 1 });
  const 부름 = blob.부른것.find(x => x.이름 === 'put');
  assert.equal(부름.설정.access, 'private');
  assert.equal(부름.설정.allowOverwrite, true);
  assert.equal(부름.설정.contentType, 'application/json');
  assert.equal(JSON.parse(blob.담긴것.get('가.json')).판, 현재판);
});

test('없는 것은 null 이다', async () => {
  assert.equal(await 저장소만들기(가짜blob()).읽기('없음.json'), null);
});

test('판이 다르면 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '낡음.json': JSON.stringify({ 판: 0, 값: 1 }) });
  assert.equal(await 저장소만들기(blob).읽기('낡음.json'), null);
});

test('판이 아예 없어도 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '옛것.json': JSON.stringify({ 값: 1 }) });
  assert.equal(await 저장소만들기(blob).읽기('옛것.json'), null);
});

test('깨진 JSON 은 없는 것으로 본다', async () => {
  const blob = 가짜blob({ '깨짐.json': '{{{' });
  assert.equal(await 저장소만들기(blob).읽기('깨짐.json'), null);
});

test('읽기가 던져도 null 로 넘긴다', async () => {
  const blob = 가짜blob();
  blob.get = async () => {
    throw new Error('망가짐');
  };
  assert.equal(await 저장소만들기(blob).읽기('가.json'), null);
});

test('접두사로 목록을 뽑는다', async () => {
  const blob = 가짜blob({
    'users/1/talks/가.json': '{}',
    'users/1/talks/나.json': '{}',
    'users/2/talks/다.json': '{}',
  });
  assert.deepEqual(await 저장소만들기(blob).목록('users/1/talks/'), [
    'users/1/talks/가.json',
    'users/1/talks/나.json',
  ]);
});

test('지운다', async () => {
  const blob = 가짜blob({ '가.json': '{}' });
  await 저장소만들기(blob).지우기('가.json');
  assert.equal(blob.담긴것.has('가.json'), false);
});
