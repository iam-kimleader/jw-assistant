// OpenAI Responses API 답변 생성과 자료 기반 폴백을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enhanceAnswersWithAI } from './ai-answer.mjs';

const 답변들 = [{
  id: 'q-1',
  질문: '우리 시대는 노아의 날과 어떻게 비슷합니까?',
  답변: '기존 답변입니다.',
  핵심문장: ['노아 시대 사람들은 경고에 주의를 기울이지 않았습니다.'],
  참고출판물: [{
    표시: '「파02」 3/1 5면 3항–6면 4항',
    제목: '그 고대 세상은 왜 멸망되었는가?',
    출판물: '파수대—여호와의 왕국 선포 2002',
    url: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2002161#p4',
    조회일: '2026-08-08',
    본문: '홍수 전의 문명은 발달했지만 사회는 폭력과 악으로 가득했습니다.',
  }],
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
    imageFetchImpl: async () => ({ bytes: Buffer.from('image-bytes'), contentType: 'image/png' }),
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [{ content: [{ type: 'output_text', text: JSON.stringify({ answers: [{ id: 'q-1', answer: '하느님의 न्याय이 실제로 집행됩니다.', selectedVerse: '' }] }) }] }],
        }),
      };
    },
  });

  assert.equal(request.model, 'gpt-5.4-mini');
  assert.equal(request.text.format.type, 'json_schema');
  assert.equal(request.text.format.strict, true);
  assert.deepEqual(request.text.format.schema.properties.answers.items.required, ['id', 'answer', 'selectedVerse']);
  assert.equal(request.reasoning.effort, 'low');
  const textInput = request.input[1].content.find(item => item.type === 'input_text').text;
  assert.match(textInput, /홍수 전의 문명은 발달했지만 사회는 폭력과 악으로 가득했습니다/);
  assert.match(textInput, /https:\/\/wol\.jw\.org\/ko\/wol\/d\/r8\/lp-ko\/2002161#p4/);
  const imageInput = request.input[1].content.find(item => item.type === 'input_image');
  assert.match(imageInput.image_url, /^data:image\/png;base64,/);
  assert.doesNotMatch(imageInput.image_url, /wol\.jw\.org/);
  assert.equal(result.answers[0].답변, '하느님의 심판이 실제로 집행됩니다.');
  assert.equal(result.generation.mode, 'ai');
});

test('API 오류는 비밀 키 없이 상태와 오류 코드만 기록한다', async () => {
  const logs = [];
  const result = await enhanceAnswersWithAI(답변들, {}, {
    apiKey: 'secret-test-key',
    logger: { error: (...args) => logs.push(args.join(' ')) },
    imageFetchImpl: async () => ({ bytes: Buffer.from('image-bytes'), contentType: 'image/png' }),
    fetchImpl: async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { type: 'invalid_request_error', code: 'invalid_api_key', param: 'api_key', message: '키가 올바르지 않습니다.' } }),
    }),
  });

  assert.equal(result.generation.mode, 'fallback');
  assert.match(logs[0], /OpenAI API 401 \(invalid_request_error \| invalid_api_key \| api_key \| 키가 올바르지 않습니다\.\)/);
  assert.doesNotMatch(logs[0], /secret-test-key/);
});

test('답변이 많으면 작은 묶음으로 나눠 병렬 생성한다', async () => {
  const manyAnswers = Array.from({ length: 7 }, (_, index) => ({
    ...답변들[0],
    id: `q-${index + 1}`,
    삽화: [],
    참고출판물: [],
  }));
  let calls = 0;
  const result = await enhanceAnswersWithAI(manyAnswers, { title: '노아' }, {
    apiKey: 'test-key',
    batchSize: 3,
    fetchImpl: async (_url, options) => {
      calls++;
      const request = JSON.parse(options.body);
      const textInput = request.input[1].content.find(item => item.type === 'input_text').text;
      const items = JSON.parse(textInput.split('질문별 자료:\n')[1]);
      return {
        ok: true,
        json: async () => ({
          output: [{
            content: [{
              type: 'output_text',
              text: JSON.stringify({ answers: items.map(item => ({ id: item.id, answer: `${item.id} 생성 답변입니다.`, selectedVerse: '' })) }),
            }],
          }],
        }),
      };
    },
  });

  assert.equal(calls, 3);
  assert.equal(result.answers.length, 7);
  assert.equal(result.answers[6].답변, 'q-7 생성 답변입니다.');
  assert.deepEqual(result.generation, { mode: 'ai', model: 'gpt-5.4-mini', batches: 3 });
});

test('영적 보물 질문은 주간 범위 본문을 보내고 범위 안의 선택 성구를 표시한다', async () => {
  const weeklyAnswer = {
    ...답변들[0],
    id: 'gem-2',
    질문: '이번 주 성경 읽기를 통해 어떤 영적 보물을 발견했습니까?',
    답변: '로컬 폴백 답변입니다.',
    핵심문장: [],
    참고출판물: [],
    성구: [],
    삽화: [],
    주간성경읽기: {
      범위: '예레미야 22-23장',
      책: '예레미야',
      본문: [
        { 주소: '예레미야 22:3', 본문: '공의와 의를 행하여라.' },
        { 주소: '예레미야 23:24', 본문: '내가 하늘과 땅을 가득 채우고 있지 않느냐?' },
      ],
    },
  };
  let request;
  const result = await enhanceAnswersWithAI([weeklyAnswer], { title: '생활과 봉사' }, {
    apiKey: 'test-key',
    fetchImpl: async (_url, options) => {
      request = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          output: [{ content: [{
            type: 'output_text',
            text: JSON.stringify({ answers: [{
              id: 'gem-2',
              answer: '예레미야 22:3에서 여호와께서 공의를 중요하게 여기신다는 점을 배웠습니다.',
              selectedVerse: '예레미야 22:3',
            }] }),
          }] }],
        }),
      };
    },
  });

  const textInput = request.input[1].content.find(item => item.type === 'input_text').text;
  assert.match(textInput, /예레미야 22-23장/);
  assert.match(textInput, /예레미야 23:24/);
  assert.equal(result.answers[0].생성방식, 'ai');
  assert.equal(result.answers[0].성구[0].본문[0].주소, '예레미야 22:3');
  assert.equal(result.answers[0].성구[0].본문[0].본문, '공의와 의를 행하여라.');
});

test('영적 보물 질문이 범위 밖 성구를 고르면 AI 답변을 채택하지 않는다', async () => {
  const weeklyAnswer = {
    id: 'gem-2',
    질문: '이번 주 성경 읽기를 통해 어떤 영적 보물을 발견했습니까?',
    답변: '예레미야 22:3을 사용한 로컬 폴백 답변입니다.',
    핵심문장: [],
    참고출판물: [],
    성구: [{ 라벨: '폴백', 본문: [{ 주소: '예레미야 22:3', 본문: '공의와 의를 행하여라.' }] }],
    삽화: [],
    주간성경읽기: {
      범위: '예레미야 22-23장',
      책: '예레미야',
      본문: [{ 주소: '예레미야 22:3', 본문: '공의와 의를 행하여라.' }],
    },
  };
  const result = await enhanceAnswersWithAI([weeklyAnswer], {}, {
    apiKey: 'test-key',
    logger: { error: () => {} },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        output: [{ content: [{
          type: 'output_text',
          text: JSON.stringify({ answers: [{
            id: 'gem-2',
            answer: '노아에 관한 잘못된 답변입니다.',
            selectedVerse: '창세기 6:9',
          }] }),
        }] }],
      }),
    }),
  });

  assert.equal(result.generation.mode, 'fallback');
  assert.equal(result.answers[0].답변, '예레미야 22:3을 사용한 로컬 폴백 답변입니다.');
  assert.equal(result.answers[0].성구[0].본문[0].주소, '예레미야 22:3');
});
