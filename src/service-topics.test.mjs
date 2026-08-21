// WOL 야외 봉사 색인 파서와 주제 매니페스트 로더를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTopicIndex } from './service-topics.mjs';

const html = readFileSync('tests/fixtures/wol-야외봉사-색인.html', 'utf8');

test('소제목과 하위 항목을 모두 주제로 뽑는다', () => {
  const { 주제들, 통계 } = parseTopicIndex(html);

  assert.equal(통계.소제목, 4);
  assert.equal(통계.하위, 1);
  assert.equal(통계.링크, 5);
  assert.deepEqual(Object.keys(주제들).sort(), [
    '개인적 목표', '게을리하지 않음', '관심이 자라게 함', '구원을 위한 “공개적 선언” (롬 10:10)',
    '도달하기 위해 받을 수 있는 도움',
  ]);
});

test('라벨 안의 성구 표기를 잘라먹지 않는다', () => {
  const { 주제들 } = parseTopicIndex(html);

  // 콜론으로 자르면 「구원을 위한 “공개적 선언” (롬 10」이 되고
  // 첫 <a> 로 자르면 「구원을 위한 “공개적 선언” (」이 된다. 둘 다 라벨을 망가뜨린다.
  assert.ok(주제들['구원을 위한 “공개적 선언” (롬 10:10)']);
  assert.deepEqual(주제들['구원을 위한 “공개적 선언” (롬 10:10)'].참고, [
    { 표시: '감 209', pc: '/ko/wol/pc/r8/lp-ko/1200272149/30/0' },
  ]);
});

test('하위 항목은 직전 소제목을 상위로 가리킨다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.equal(주제들['개인적 목표'].상위, null);
  assert.equal(주제들['도달하기 위해 받을 수 있는 도움'].상위, '개인적 목표');
});

test('출판물 약칭과 pc 링크를 짝지어 담는다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.deepEqual(주제들['관심이 자라게 함'].참고, [
    { 표시: '파19.07 15-16', pc: '/ko/wol/pc/r8/lp-ko/1200272149/23/0' },
    { 표시: '파16.08 27-28', pc: '/ko/wol/pc/r8/lp-ko/1200272149/23/2' },
  ]);
});

test('링크가 없는 소제목도 빈 참고로 남긴다', () => {
  const { 주제들 } = parseTopicIndex(html);

  assert.deepEqual(주제들['게을리하지 않음'].참고, []);
});
