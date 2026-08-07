// 질문 답변 초안 생성 규칙을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { loadRefs } from './refs-lookup.mjs';
import { buildAnswerDraft } from './prep-answer.mjs';

const skip = !existsSync('core/bible/index.json') || !existsSync('core/bible/refs');

test('문단과 코어 성구로 답변 초안을 만든다', { skip }, () => {
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const result = buildAnswerDraft({
    id: 'q1',
    질문: '1. 무엇을 배울 수 있습니까?',
    문단본문: ['우리는 여호와를 신뢰해야 합니다. 그분은 자신의 백성을 돕습니다.'],
    인용: [{ 라벨: '잠언 3:5', bid: '1-1' }],
  }, 도구);
  assert.match(result.답변, /문단의 흐름/);
  assert.equal(result.성구.length, 1);
  assert.match(result.성구[0].본문[0].본문, /여호와/);
});
