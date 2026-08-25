// 세 API가 부르는 조립 계층을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { 배정목록, 원고준비 } from './talk-service.mjs';

const 교재 = readFileSync('tests/fixtures/교재-배정.html', 'utf8');
const 가짜조회 = async () => 교재;
// weekDocuments 는 네트워크를 타므로 테스트에서 가짜를 넣는다.
const 가짜주 = async () => ({ 교재docId: 202026248, 주라벨: '2026년 8월 24-30일' });
const 매니페스트 = { 읽가: { 제목: '가', 조회일: '2026-08-25', 과: [{ 번호: 1, 제목: '효과적인 서론', 요점: '흥미를 일으킵니다.', 원칙: '', docid: 1102018441 }] }, 랑제: { 제목: '나', 조회일: '2026-08-25', 과: [] } };
const 읽기 = () => null;
const 형제 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };

test('연설이 아닌 항목은 목록에서 뺀다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.ok(!배정.some(x => x.종류 === '연설아님'));
  assert.ok(배정.some(x => x.번호 === 1));
});

test('자격 게이트가 목록에 씌워진다', async () => {
  const { 배정 } = await 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 조회: 가짜조회, 주찾기: 가짜주 });
  const 보물 = 배정.find(x => x.번호 === 1);
  const 시연 = 배정.find(x => x.번호 === 4);

  assert.equal(보물.가능, false);
  assert.equal(시연.가능, true);
  assert.match(보물.사유, /장로/);
});

test('공개강연 카드가 언제나 함께 온다', async () => {
  const { 공개강연카드 } = await 배정목록({ 날짜: '2026-08-24', 프로필: { ...형제, 임명: '장로' }, 조회: 가짜조회, 주찾기: 가짜주 });

  assert.equal(공개강연카드.종류, '공개강연');
  assert.equal(공개강연카드.가능, true);
  assert.equal(공개강연카드.시간초, 1800);
});

test('교재 조회가 실패하면 예외를 던진다', async () => {
  await assert.rejects(
    () => 배정목록({ 날짜: '2026-08-24', 프로필: 형제, 주찾기: 가짜주, 조회: async () => { throw new Error('ETIMEDOUT'); } }),
    /ETIMEDOUT/,
  );
});

test('원고 준비가 산출물 네 개와 시간을 함께 돌려준다', async () => {
  const 뼈대 = {
    제목: '가', 종류: '보물연설', 배정시간: 600, 지정요점: null, 주제성구: null, 설정: null,
    구간: [{ 이름: '서론', 시작초: 0, 끝초: 60, 목적: '연다' }],
    대사: [], 단락: [{ 소제목: '소제목', 출처: '교재', 요점: [], 예화: '', 적용: '', 성구주소: [] }],
    성구: [], 축약순서: [], 출처: [], 경고: [],
  };
  const { 산출물, 시간 } = await 원고준비(
    { 뼈대, 프로필: 형제 },
    { 매니페스트, 읽기, 설정: { apiKey: '', fetchImpl: async () => { throw new Error('x'); } } },
  );

  assert.deepEqual(Object.keys(산출물).sort(), ['낭독대본', '점검표', '준비원고', '큐카드']);
  assert.equal(시간.배정초, 600);
  assert.equal(typeof 시간.총초, 'number');
});
