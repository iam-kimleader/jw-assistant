// 연설 화면의 시간 표기와 파일 이름 규칙을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 분초표시, 파일이름, 구간합계, 시간요약 } from '../web/src/lib/talk-format.mjs';

test('초를 분과 초로 나눈다', () => {
  assert.equal(분초표시(0), '0분 0초');
  assert.equal(분초표시(59), '0분 59초');
  assert.equal(분초표시(60), '1분 0초');
  assert.equal(분초표시(1800), '30분 0초');
  assert.equal(분초표시(305), '5분 5초');
});

test('음수와 없는 값은 0으로 본다', () => {
  assert.equal(분초표시(-10), '0분 0초');
  assert.equal(분초표시(undefined), '0분 0초');
  assert.equal(분초표시(null), '0분 0초');
});

test('파일 이름에서 쓸 수 없는 글자를 걷어낸다', () => {
  assert.equal(파일이름('2026-08-26', 'a/b:c*d?e"f<g>h|i', '준비원고'), '2026-08-26-abcdefghi-준비원고.md');
});

test('파일 이름의 제목은 40자에서 자른다', () => {
  const 이름 = 파일이름('2026-08-26', '가'.repeat(60), '큐카드');
  assert.equal(이름, `2026-08-26-${'가'.repeat(40)}-큐카드.md`);
});

test('구간 합계는 가장 늦은 끝을 쓴다', () => {
  assert.equal(구간합계([{ 끝초: 60 }, { 끝초: 300 }, { 끝초: 180 }]), 300);
  assert.equal(구간합계([]), 0);
  assert.equal(구간합계(undefined), 0);
});

test('배정 안에 들어오면 경고 없이 요약한다', () => {
  const 요약 = 시간요약({ 총초: 1700, 배정초: 1800, 초과: 0 });
  assert.equal(요약.경고, false);
  assert.equal(요약.글, '예상 28분 20초 · 배정 30분 0초.');
});

test('배정을 넘기면 경고로 알리고 축약 단계를 덧붙인다', () => {
  const 요약 = 시간요약({
    총초: 2000, 배정초: 1800, 초과: 200,
    축약적용: [{ 순위: 1, 총초: 1900 }, { 순위: 2, 총초: 1750 }],
  });
  assert.equal(요약.경고, true);
  assert.match(요약.글, /예상 33분 20초로 배정\(30분 0초\)보다 3분 20초 초과입니다\./);
  assert.match(요약.글, /1단계 축약 시 31분 40초, 2단계 축약 시 29분 10초\./);
});

test('축약 단계가 없으면 문장을 덧붙이지 않는다', () => {
  const 요약 = 시간요약({ 총초: 2000, 배정초: 1800, 초과: 200 });
  assert.equal(요약.글.endsWith('초과입니다.'), true);
});

test('시간이 없으면 요약도 없다', () => {
  assert.equal(시간요약(null), null);
});
