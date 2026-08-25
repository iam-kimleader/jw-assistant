// 자유 형식 구조화 출력을 받는 최소 OpenAI Responses API 호출 모듈
export const 기본모델 = 'gpt-5.4-mini';

function 출력텍스트(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

function 폴백(warning) {
  return { 결과: null, 생성: { mode: 'fallback', warning } };
}

export async function 구조화생성({ 지시, 자료, 스키마, 스키마이름, 설정 = {} }) {
  const { apiKey, model = 기본모델, fetchImpl = fetch } = 설정;
  if (!apiKey) return 폴백('OpenAI 키가 없어 규칙으로 만들었습니다.');

  const body = {
    model,
    input: [
      { role: 'system', content: [{ type: 'input_text', text: 지시.join('\n') }] },
      { role: 'user', content: [{ type: 'input_text', text: JSON.stringify(자료) }] },
    ],
    text: { format: { type: 'json_schema', name: 스키마이름, strict: true, schema: 스키마 } },
  };

  try {
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = String(payload.error?.message ?? '').slice(0, 200);
      return 폴백(`OpenAI API ${response.status}${detail ? ` (${detail})` : ''}`);
    }
    return { 결과: JSON.parse(출력텍스트(payload)), 생성: { mode: 'ai', warning: '' } };
  } catch (e) {
    return 폴백(`OpenAI 호출 실패 — ${e.message}`);
  }
}
