// OpenAI Responses API 답변 생성과 자료 기반 폴백을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enhanceAnswersWithAI } from './ai-answer.mjs';

const 답변들 = [{
  id: 'q-1',
  질문: '우리 시대는 노아의 날과 어떻게 비슷합니까?',
  답변: '기존 답변입니다.',
  핵심문장: ['노아 시대 사람들은 경고에 주의를 기울이지 않았습니다.'],
  성구: [{ 라벨: '마태 24:36-39', 본문: [{ 주소: '마태복음 24:37', 본문: '노아의 날처럼 사람의 아들의 임재도 그러할 것입니다.' }] }],
  삽화: [{ url: 'https://wol.jw.org/ko/wol/mp/example', alt: '노아가 방주를 짓고 있습니다.' }],
}];

test('API 키가 없으면 기존 답변을 그대로 사용한다', async () => {
  let called = false;
  const result = await enhanceAnswersWithAI(답변들, {}, {
    apiKey: '',
    fetchImpl: async () => { called = true; },
  });

  assert.equal(called, false);
  assert.equal(result.answers[0].답변, '기존 답변입니다.');
  assert.equal(result.generation.mode, 'fallback');
});

test('질문과 삽화를 구조화된 Responses API 요청으로 보낸다', async () => {
  let request;
  const result = await enhanceAnswersWithAI(답변들, { title: '노아', sourceUrl: 'https://wol.jw.org/example' }, {
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [{ content: [{ type: 'output_text', text: JSON.stringify({ answers: [{ id: 'q-1', answer: '사람들이 경고에 주의를 기울이지 않는다는 점이 비슷합니다.' }] }) }] }],
        }),
      };
    },
  });

  assert.equal(request.model, 'gpt-5.4-mini');
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.ok(request.input[1].content.some(item => item.type === 'input_image'));
  assert.equal(result.answers[0].답변, '사람들이 경고에 주의를 기울이지 않는다는 점이 비슷합니다.');
  assert.equal(result.generation.mode, 'ai');
});
