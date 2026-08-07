// 준비 화면의 예상 진행률 계산과 원형 게이지 구성을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { estimatePreparationProgress } from '../web/progress.js';

const app = readFileSync('web/app.js', 'utf8');
const css = readFileSync('web/styles.css', 'utf8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

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
  assert.match(app, /gauge\.setAttribute\('role', 'progressbar'\)/);
  assert.match(app, /detail\.textContent = '예상 진행률'/);
  assert.match(app, /progress\.complete\(\)/);
  assert.match(css, /\.progress-gauge\s*\{[\s\S]*conic-gradient/);
});

test('Vercel이 진행률 모듈을 공개 경로로 연결한다', () => {
  assert.equal(vercel.rewrites.some(rule => rule.source === '/progress.js' && rule.destination === '/web/progress.js'), true);
});
