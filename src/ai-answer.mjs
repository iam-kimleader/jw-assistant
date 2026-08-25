// 준비 자료와 삽화를 OpenAI Responses API의 한국어 답변으로 다듬는 모듈
import { fetchBinary } from './wol-fetch.mjs';
import { findWeeklyReadingVerse } from './weekly-reading.mjs';

const 기본모델 = 'gpt-5.6-terra';
const 기본강도 = 'high';

// 추론 강도는 요청마다 환경에서 읽는다. 모델 이름을 읽는 방식과 같다.
// 값은 none·minimal·low·medium·high·xhigh·max 이며 생략하면 API 기본값은 medium 이다.
function 추론강도() {
  return process.env.OPENAI_REASONING_EFFORT || 기본강도;
}

function 폴백(answers, warning) {
  return {
    answers,
    generation: {
      mode: 'fallback',
      warning,
    },
  };
}

function 출력텍스트(response) {
  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === 'output_text' && content.text) return content.text;
    }
  }
  return '';
}

function 자연스럽게(text) {
  return String(text)
    .replace(/문단의 흐름을 근거로 보면\s*/g, '')
    .replace(/성구 근거로는\s*/g, '')
    .replace(/न्याय/g, '심판')
    .trim();
}

async function 요청본문(answers, context, model, imageFetchImpl, logger) {
  const 자료 = answers.map(answer => ({
    id: answer.id,
    질문: answer.질문,
    상위질문: answer.상위질문 || undefined,
    소제목: answer.소제목 || undefined,
    출판물근거: answer.핵심문장,
    참고출판물: (answer.참고출판물 ?? []).map(reference => ({
      표시: reference.표시,
      제목: reference.제목,
      출판물: reference.출판물,
      URL: reference.url,
      조회일: reference.조회일,
      본문: reference.본문,
    })),
    주간성경읽기: answer.주간성경읽기 ? {
      범위: answer.주간성경읽기.범위,
      책: answer.주간성경읽기.책,
      본문: answer.주간성경읽기.본문,
    } : undefined,
    성구: (answer.주간성경읽기 ? [] : (answer.성구 ?? [])).map(group => ({
      라벨: group.라벨,
      본문: group.본문.map(verse => ({ 주소: verse.주소, 본문: verse.본문 })),
    })),
    삽화설명: (answer.삽화 ?? []).map(image => image.alt).filter(Boolean),
  }));

  const content = [{
    type: 'input_text',
    text: [
      `연구 자료 제목: ${context.title ?? ''}`,
      `공식 출판물 URL: ${context.sourceUrl ?? ''}`,
      `조회일: ${context.accessedAt ?? new Date().toISOString().slice(0, 10)}`,
      '질문별 자료:',
      JSON.stringify(자료),
    ].join('\n'),
  }];

  for (const answer of answers) {
    for (const image of answer.삽화 ?? []) {
      content.push({ type: 'input_text', text: `다음 이미지는 질문 ID ${answer.id}에 연결된 삽화입니다. 대체 설명: ${image.alt || '없음'}` });
      try {
        const downloaded = await imageFetchImpl(image.url);
        const imageUrl = `data:${downloaded.contentType};base64,${Buffer.from(downloaded.bytes).toString('base64')}`;
        content.push({ type: 'input_image', image_url: imageUrl, detail: 'auto' });
      } catch (error) {
        logger.error('AI 삽화 다운로드 실패.', error instanceof Error ? error.message : String(error));
      }
    }
  }

  return {
    model,
    store: false,
    reasoning: { effort: 추론강도() },
    input: [
      {
        role: 'system',
        content: [{
          type: 'input_text',
          text: [
            '여호와의 증인의 성경 이해를 따르는 한국어 성경 연구 보조자입니다.',
            '제공된 공식 출판물 문장, 질문별 참고 출판물 본문, 정확한 성구 본문, 삽화만 근거로 각 질문에 직접 답하십시오.',
            '질문별 자료는 서로 독립적입니다. 한 질문의 출판물, 성구, 삽화, 주간 성경 읽기 자료를 다른 질문의 답변에 섞지 마십시오.',
            '참고 출판물이 있으면 해당 본문의 사실과 논리를 우선 사용하고, 질문과 어떤 관련이 있는지 설명하십시오.',
            '주간성경읽기가 제공된 질문은 반드시 그 범위 안에서 의미 있는 성구 하나를 골라 답하고, selectedVerse에는 제공된 주소를 글자 그대로 쓰십시오. 답변에도 그 성구 주소와 배운 점 또는 적용점을 포함하십시오.',
            '주간성경읽기가 없는 질문의 selectedVerse는 빈 문자열로 쓰십시오.',
            '단순히 문장을 옮기지 말고 원인과 결과, 시간 순서, 대조점, 실생활 의미 가운데 질문에 필요한 연결을 분명히 하십시오.',
            '합리적인 추론은 자료에서 확인되는 사실과 구분되는 표현으로 제시하고, 질문에 여러 부분이 있으면 빠짐없이 모두 답하십시오.',
            '독자적인 새 교리를 만들지 말고, 자료에 없는 교리적 결론은 답변 끝에 "출판물 근거 미확인 — 내 정리임."이라고 밝히십시오.',
            '적용이나 감상을 묻는 질문에는 제공된 원칙을 바탕으로 자연스럽고 겸손한 1인칭 답변을 작성할 수 있습니다.',
            '삽화가 있으면 실제 이미지와 대체 설명을 함께 살펴 질문에 필요한 관찰을 반영하십시오.',
            '각 답변은 보통 한국어 3-6문장으로 충분히 설명하되, 단순한 질문은 억지로 늘리지 마십시오.',
            '답변에는 한글, 라틴 문자, 숫자, 일반 문장 부호만 사용하고 다른 문자 체계의 낱말을 섞지 마십시오.',
            '"문단의 흐름을 근거로 보면"과 "성구 근거로는"이라는 표현은 사용하지 마십시오.',
            '질문 ID를 바꾸거나 합치지 마십시오.',
          ].join('\n'),
        }],
      },
      { role: 'user', content },
    ],
    text: {
      format: {
        type: 'json_schema',
        name: 'study_answers',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            answers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  answer: { type: 'string' },
                  selectedVerse: { type: 'string' },
                },
                required: ['id', 'answer', 'selectedVerse'],
                additionalProperties: false,
              },
            },
          },
          required: ['answers'],
          additionalProperties: false,
        },
      },
    },
  };
}

async function 단일묶음생성(answers, context, settings) {
  const { apiKey, model, fetchImpl, imageFetchImpl, logger } = settings;
  try {
    const body = await 요청본문(answers, context, model, imageFetchImpl, logger);
    const response = await fetchImpl('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120_000),
    });
    const payload = await response.json();
    if (!response.ok) {
      const detail = [
        payload.error?.type,
        payload.error?.code,
        payload.error?.param,
        String(payload.error?.message ?? '').slice(0, 300),
      ].filter(Boolean).join(' | ');
      throw new Error(`OpenAI API ${response.status ?? 'error'}${detail ? ` (${detail})` : ''}`);
    }

    const parsed = JSON.parse(출력텍스트(payload));
    const 원본답변 = new Map(answers.map(answer => [answer.id, answer]));
    const 생성답변 = new Map();
    for (const item of parsed.answers ?? []) {
      const answer = 원본답변.get(item.id);
      const text = 자연스럽게(item.answer);
      if (!answer || !text) continue;
      const selectedVerse = answer.주간성경읽기
        ? findWeeklyReadingVerse(answer.주간성경읽기, `${item.selectedVerse ?? ''} ${text}`)
        : null;
      if (answer.주간성경읽기 && !selectedVerse) {
        logger.warn('주간 성경 읽기 선택 성구 검증 실패.', String(item.selectedVerse ?? '').slice(0, 100));
        continue;
      }
      생성답변.set(item.id, { text, selectedVerse });
    }
    if (!생성답변.size) throw new Error('OpenAI API가 답변을 반환하지 않음');

    return {
      answers: answers.map(answer => {
        const generated = 생성답변.get(answer.id);
        if (!generated) return answer;
        return {
          ...answer,
          답변: generated.text,
          생성방식: 'ai',
          성구: generated.selectedVerse
            ? [{ 라벨: `${answer.주간성경읽기.범위}에서 선택한 성구`, 본문: [generated.selectedVerse] }]
            : answer.성구,
        };
      }),
      generation: { mode: 'ai', model },
    };
  } catch (error) {
    logger.error('AI 답변 생성 실패.', error instanceof Error ? error.message : String(error));
    return 폴백(answers, 'AI 답변을 불러오지 못해 공식 자료 기반 초안을 표시합니다.');
  }
}

export async function enhanceAnswersWithAI(answers, context = {}, options = {}) {
  if (!answers.length) return { answers, generation: { mode: 'empty' } };

  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? '';
  if (!apiKey) return 폴백(answers, 'AI 답변 기능이 설정되지 않아 공식 자료 기반 초안을 표시합니다.');

  const model = options.model ?? process.env.OPENAI_MODEL ?? 기본모델;
  const configuredBatchSize = Number(options.batchSize ?? process.env.OPENAI_BATCH_SIZE ?? 5);
  const batchSize = Number.isInteger(configuredBatchSize) && configuredBatchSize > 0 ? configuredBatchSize : 5;
  const settings = {
    apiKey,
    model,
    fetchImpl: options.fetchImpl ?? fetch,
    imageFetchImpl: options.imageFetchImpl ?? fetchBinary,
    logger: options.logger ?? console,
  };
  const batches = [];
  for (let index = 0; index < answers.length; index += batchSize) batches.push(answers.slice(index, index + batchSize));
  if (batches.length === 1) return 단일묶음생성(answers, context, settings);

  const results = await Promise.all(batches.map(batch => 단일묶음생성(batch, context, settings)));
  const aiBatches = results.filter(result => result.generation.mode === 'ai').length;
  return {
    answers: results.flatMap(result => result.answers),
    generation: aiBatches === results.length
      ? { mode: 'ai', model, batches: results.length }
      : aiBatches > 0
        ? { mode: 'partial-ai', model, batches: results.length, warning: '일부 답변은 AI를 불러오지 못해 공식 자료 기반 초안을 표시합니다.' }
        : { mode: 'fallback', warning: 'AI 답변을 불러오지 못해 공식 자료 기반 초안을 표시합니다.' },
  };
}
