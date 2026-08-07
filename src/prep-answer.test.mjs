// 질문 답변 초안 생성 규칙을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { loadRefs } from './refs-lookup.mjs';
import { buildAnswerDraft, buildArticleAnswers } from './prep-answer.mjs';

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
  assert.equal(result.답변, '우리는 여호와를 신뢰해야 합니다. 그분은 자신의 백성을 돕습니다.');
  assert.doesNotMatch(result.답변, /문단의 흐름을 근거로 보면|성구 근거로는/);
  assert.equal(result.성구.length, 1);
  assert.match(result.성구[0].본문[0].본문, /여호와/);
});

test('(ㄱ)과 (ㄴ) 질문을 독립된 답변으로 나눈다', () => {
  const result = buildArticleAnswers({
    문단그룹: [{
      질문: '1-2. (ㄱ) 계속 어떻게 할 필요가 있습니까? (ㄴ) 동일한 행로로 걷는다는 것은 무엇을 의미합니까?',
      문단번호: [1, 2],
      문단본문: [
        '지금까지 해 온 것처럼 계속 영적으로 전진해야 합니다.',
        '동일한 행로로 걷는다는 표현은 질서 있게 앞으로 나아가는 것을 의미합니다.',
      ],
      인용: [],
    }],
  }, { index: {}, text: {} }, 'https://example.com/article');

  assert.equal(result.length, 2);
  assert.equal(result[0].질문, '(ㄱ) 계속 어떻게 할 필요가 있습니까?');
  assert.equal(result[1].질문, '(ㄴ) 동일한 행로로 걷는다는 것은 무엇을 의미합니까?');
  assert.notEqual(result[0].id, result[1].id);
  assert.match(result[0].답변, /계속 영적으로 전진/);
  assert.match(result[1].답변, /질서 있게 앞으로/);
});
