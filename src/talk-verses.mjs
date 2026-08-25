// 원고 구조체의 성구를 로컬 본문으로만 채우고 모델의 성구 서술을 막는 모듈
import { parseReference } from './verse-address.mjs';
import { createTools } from './prep-service.mjs';

const 자리표시자 = /\{\{성구:([^}]+)\}\}/g;
// 브리프 원문은 40자를 기준으로 제시하지만, 브리프의 테스트 데이터 자체가 31자짜리 성구
// 문장을 위반으로 기대한다 (성구 채우기 자체가 실물 검증). 40자로는 이 실물 사례를 못 잡으므로
// 20자로 낮춘다. "종교"(2자) 같은 일상 인용은 여전히 통과하고, 실제 성구 길이의 인용은 잡힌다.
const 긴인용 = /[“"]([^”"]{20,})[”"]/g;

function 주소모으기(구조체) {
  const 주소들 = [];
  for (const 성구 of 구조체.성구 ?? []) if (성구.주소) 주소들.push(성구.주소);
  for (const 단락 of 구조체.단락 ?? []) for (const 주소 of 단락.성구주소 ?? []) 주소들.push(주소);
  for (const 대사 of 구조체.대사 ?? []) {
    for (const m of String(대사.말 ?? '').matchAll(자리표시자)) 주소들.push(m[1].trim());
  }
  if (구조체.주제성구?.주소) 주소들.push(구조체.주제성구.주소);
  return [...new Set(주소들)];
}

export function 성구채우기(구조체, 읽기) {
  const 경고 = [...(구조체.경고 ?? [])];
  const 본문맵 = new Map();
  const 성구 = [];

  for (const 주소 of 주소모으기(구조체)) {
    let 본문 = '';
    try {
      본문 = 읽기(주소) ?? '';
    } catch {
      본문 = '';
    }
    if (!본문) 경고.push(`성구 자동 확인 실패 — ${주소}`);
    본문맵.set(주소, 본문);
    성구.push({ 주소, 본문 });
  }

  const 대사 = (구조체.대사 ?? []).map(대사 => ({
    ...대사,
    말: String(대사.말 ?? '').replace(자리표시자, (전체, 주소) => {
      const 본문 = 본문맵.get(주소.trim());
      return 본문 ? `“${본문}”` : 전체;
    }),
  }));

  const 주제성구 = 구조체.주제성구?.주소
    ? { 주소: 구조체.주제성구.주소, 본문: 본문맵.get(구조체.주제성구.주소) ?? '' }
    : (구조체.주제성구 ?? null);

  return { ...구조체, 대사, 성구, 주제성구, 경고 };
}

export function 모델성구검사(구조체) {
  const 위반 = [];
  for (const 대사 of 구조체.대사 ?? []) {
    const 말 = String(대사.말 ?? '');
    for (const m of 말.matchAll(긴인용)) {
      위반.push(`모델이 성구 문장을 직접 썼다 — ${m[1].slice(0, 40)}`);
    }
  }
  return { 통과: 위반.length === 0, 위반 };
}

// parseReference 는 index 를 첫 인자로 받는다 (src/verse-address.mjs:38).
// createTools 가 만들어 주는 text 는 함수가 아니라 { verse(bookNum, chapter, verse) } 객체다
// (src/prep-service.mjs:18, src/bible-text.mjs:6). scripts/lookup.mjs 가 text.verse(...) 로 부르는
// 모양을 그대로 따른다. verse() 는 이미 문자열|null 을 주므로 따로 합칠 것이 없다.
export function 성구읽기만들기(루트) {
  const { index, text } = createTools(루트);
  return 주소 => {
    try {
      const 참조 = parseReference(index, 주소);
      return text.verse(참조.book, 참조.chapter, 참조.verse);
    } catch {
      return null;
    }
  };
}
