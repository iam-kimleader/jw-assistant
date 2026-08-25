// 자유 형식 구조화 출력 OpenAI 호출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 구조화생성, 기본모델, 기본강도 } from './openai-text.mjs';

const 스키마 = {
  type: 'object',
  properties: { 제목: { type: 'string' } },
  required: ['제목'],
  additionalProperties: false,
};

function 가짜응답(본문) {
  return async () => ({
    ok: true,
    status: 200,
    json: async () => ({ output: [{ content: [{ type: 'output_text', text: JSON.stringify(본문) }] }] }),
  });
}

test('키가 없으면 호출하지 않고 폴백을 돌려준다', async () => {
  let 불렸다 = false;
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: { apiKey: '', fetchImpl: async () => { 불렸다 = true; } },
  });

  assert.equal(불렸다, false);
  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
  assert.match(결과.생성.warning, /키/);
});

test('성공하면 파싱된 객체를 돌려준다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: { 나: 1 }, 스키마, 스키마이름: 'x',
    설정: { apiKey: 'k', fetchImpl: 가짜응답({ 제목: '값' }) },
  });

  assert.deepEqual(결과.결과, { 제목: '값' });
  assert.equal(결과.생성.mode, 'ai');
});

test('요청 본문에 지시와 자료와 스키마가 들어간다', async () => {
  let 본문 = null;
  await 구조화생성({
    지시: ['첫 지시', '둘째 지시'], 자료: { 나: 1 }, 스키마, 스키마이름: 'talk_outline',
    설정: {
      apiKey: 'k',
      fetchImpl: async (url, options) => {
        본문 = JSON.parse(options.body);
        return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{"제목":"값"}' }] }] }) };
      },
    },
  });

  const 통째 = JSON.stringify(본문);
  assert.match(통째, /첫 지시/);
  assert.match(통째, /둘째 지시/);
  assert.equal(본문.text.format.name, 'talk_outline');
  assert.equal(본문.text.format.strict, true);
  assert.deepEqual(본문.reasoning, { effort: 'high' });
  assert.deepEqual(본문.text.format.schema, 스키마);
});

test('HTTP 오류를 폴백으로 바꾸고 던지지 않는다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({ ok: false, status: 429, json: async () => ({ error: { message: '한도 초과' } }) }),
    },
  });

  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
  assert.match(결과.생성.warning, /429/);
});

test('망가진 JSON을 폴백으로 바꾼다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{망가진' }] }] }) }),
    },
  });

  assert.equal(결과.결과, null);
  assert.equal(결과.생성.mode, 'fallback');
});

test('네트워크 예외를 폴백으로 바꾼다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: { apiKey: 'k', fetchImpl: async () => { throw new Error('ETIMEDOUT'); } },
  });

  assert.equal(결과.결과, null);
  assert.match(결과.생성.warning, /ETIMEDOUT/);
});

test('오류 메시지에 섞인 키는 가려서 돌려준다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: {
      apiKey: 'k',
      fetchImpl: async () => ({
        ok: false, status: 401,
        json: async () => ({ error: { message: 'Incorrect API key provided: sk-abcDEF123_456-*** at sk-proj-xyz789' } }),
      }),
    },
  });

  assert.ok(!결과.생성.warning.includes('sk-abcDEF123_456'));
  assert.ok(!결과.생성.warning.includes('sk-proj-xyz789'));
  assert.match(결과.생성.warning, /sk-\*\*\*/);
});

test('예외 메시지에 섞인 키도 가린다', async () => {
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
    설정: { apiKey: 'k', fetchImpl: async () => { throw new Error('연결 실패 — sk-live-secret123'); } },
  });

  assert.ok(!결과.생성.warning.includes('sk-live-secret123'));
  assert.match(결과.생성.warning, /sk-\*\*\*/);
});

test('추론 강도를 환경 변수로 덮을 수 있다', async () => {
  const 이전 = process.env.OPENAI_REASONING_EFFORT;
  process.env.OPENAI_REASONING_EFFORT = 'xhigh';
  let 본문 = null;
  try {
    await 구조화생성({
      지시: ['가'], 자료: {}, 스키마, 스키마이름: 'x',
      설정: {
        apiKey: 'k',
        fetchImpl: async (url, options) => {
          본문 = JSON.parse(options.body);
          return { ok: true, status: 200, json: async () => ({ output: [{ content: [{ type: 'output_text', text: '{"제목":"값"}' }] }] }) };
        },
      },
    });
  } finally {
    if (이전 === undefined) delete process.env.OPENAI_REASONING_EFFORT;
    else process.env.OPENAI_REASONING_EFFORT = 이전;
  }

  assert.equal(본문.reasoning.effort, 'xhigh');
});

test('기본 모델은 gpt-5.6-terra 이고 기본 강도는 high 다', () => {
  assert.equal(기본모델, 'gpt-5.6-terra');
  assert.equal(기본강도, 'high');
});

test('한국어 스키마 이름은 호출 전에 막는다', async () => {
  let 불렸다 = false;
  const 결과 = await 구조화생성({
    지시: ['가'], 자료: {}, 스키마, 스키마이름: '연설뼈대',
    설정: { apiKey: 'k', fetchImpl: async () => { 불렸다 = true; } },
  });

  // OpenAI 는 text.format.name 을 ^[a-zA-Z0-9_-]+$ 로만 받는다. 배포판에서 400 을 겪었다.
  assert.equal(불렸다, false);
  assert.equal(결과.결과, null);
  assert.match(결과.생성.warning, /영문/);
});
