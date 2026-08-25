// 자유 형식 구조화 출력을 받는 최소 OpenAI Responses API 호출 모듈
export const 기본모델 = 'gpt-5.6-terra';
export const 기본강도 = 'high';

function 출력텍스트(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

// 마스킹된 키 조각(sk-***)이라도 오류 메시지에 실려 브라우저까지 가면 안 된다.
function 키가리기(문장) {
  return String(문장 ?? '').replace(/sk-[A-Za-z0-9*_-]+/g, 'sk-***');
}

function 폴백(warning) {
  return { 결과: null, 생성: { mode: 'fallback', warning: 키가리기(warning) } };
}

// OpenAI 는 text.format.name 을 ^[a-zA-Z0-9_-]+$ 로만 받는다. 한국어 이름을 주면 400 이다.
// 실제 배포판에서 겪은 일이라 여기서 막는다. 테스트는 가짜 fetch 를 쓰므로 이 검사가 없으면 안 드러난다.
const 이름규칙 = /^[a-zA-Z0-9_-]+$/;

// 서버리스 함수가 먼저 죽으면 폴백조차 못 돌려주고 연결이 끊긴다. 실제로 배포판에서 겪었다.
// 그래서 요청 제한을 함수 제한보다 짧게 잡는다. OPENAI_TIMEOUT_MS 로 환경마다 맞춘다.
const 기본제한 = 30_000;
function 제한시간() {
  const 값 = Number(process.env.OPENAI_TIMEOUT_MS);
  return Number.isFinite(값) && 값 > 0 ? 값 : 기본제한;
}

export async function 구조화생성({ 지시, 자료, 스키마, 스키마이름, 설정 = {} }) {
  if (!이름규칙.test(String(스키마이름 ?? ''))) {
    return 폴백(`스키마 이름은 영문·숫자·밑줄·붙임표만 쓴다 — ${스키마이름}`);
  }
  const { apiKey, model = 기본모델, fetchImpl = fetch } = 설정;
  // 값은 none·minimal·low·medium·high·xhigh·max 다. 생략하면 API 기본값이 medium 이므로 반드시 보낸다.
  const effort = 설정.effort ?? process.env.OPENAI_REASONING_EFFORT ?? 기본강도;
  if (!apiKey) return 폴백('OpenAI 키가 없어 규칙으로 만들었습니다.');

  const body = {
    model,
    reasoning: { effort },
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
      signal: AbortSignal.timeout(제한시간()),
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
