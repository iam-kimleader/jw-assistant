// 준비 화면의 예상 진행률 계산과 원형 게이지 구성을 검증하는 테스트
// 주의: 게이지 부분은 아직 문자열 대조다. Task 9 에서 컴포넌트 시험으로 바꾼다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimatePreparationProgress } from '../web/progress.js';

const gauge = readFileSync('web/src/components/PreparationProgress.tsx', 'utf8');

test('운영 응답 시간에 맞춘 예상 진행률 구간을 계산한다', () => {
  assert.equal(estimatePreparationProgress(0), 3);
  assert.equal(estimatePreparationProgress(30_000), 30);
  assert.equal(estimatePreparationProgress(60_000), 55);
  assert.equal(estimatePreparationProgress(120_000), 86);
  assert.equal(estimatePreparationProgress(180_000), 94);
});

test('서버 응답 전 예상 진행률은 96퍼센트를 넘지 않는다', () => {
  const samples = Array.from({ length: 361 }, (_, index) => estimatePreparationProgress(index * 1_000));
  assert.equal(samples.every((value, index) => index === 0 || value >= samples[index - 1]), true);
  assert.equal(Math.max(...samples), 96);
});

test('준비 상태는 접근 가능한 원형 진행 게이지를 표시한다', () => {
  assert.match(gauge, /role="progressbar"/);
  assert.match(gauge, /aria-label="답변 준비 예상 진행률"/);
  assert.match(gauge, /aria-valuenow=\{값\}/);
  assert.match(gauge, /aria-valuetext=\{`예상 진행률 \$\{값\}퍼센트`\}/);
  assert.match(gauge, /conic-gradient/);
  assert.match(gauge, /예상 진행률/);
});

test('게이지 값은 0과 100 사이로 묶는다', () => {
  assert.match(gauge, /Math\.max\(0, Math\.min\(100, Math\.round\(진행률\)\)\)/);
});

test('요청이 끝나면 게이지를 100으로 채운다', () => {
  assert.match(gauge, /if \(완료됨\) \{\s*set진행률\(100\);/);
});
