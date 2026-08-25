// 원고 구조체의 성구를 로컬 본문으로만 채우고 모델의 성구 서술을 막는 모듈
import { parseCitation } from './citation-parse.mjs';
import { createTools } from './prep-service.mjs';

const 자리표시자 = /\{\{성구:([^}]+)\}\}/g;
// 인용부호 안이 25자를 넘으면 모델이 성구 문장을 직접 쓴 것으로 본다.
// 길이 어림짐작이다. 실측 근거는 팜플렛 제목 인용이 21자, 성구 낭독이 31자 이상인 것이다.
// 짧은 성구를 지어 쓰면 이 그물을 빠져나간다. 최후의 보루는 성구채우기 가 성구.본문 을
// 언제나 로컬 본문으로 덮어쓰는 것과, 대사에서는 {{성구:…}} 자리표시자만 쓰게 하는 것이다.
const 긴인용 = /[“"]([^”"]{25,})[”"]/g;

// 모델이 쓴 산문이 사는 자리다. 단락.소제목 은 교재·개요 원문이라 여기서 빼며,
// 모델성구검사 가 검사에서 빼는 이유와 같다.
function 모델산문들(구조체) {
  const 목록 = [];
  for (const 대사 of 구조체.대사 ?? []) 목록.push(대사.말);
  for (const 단락 of 구조체.단락 ?? []) {
    for (const 요점 of 단락.요점 ?? []) 목록.push(요점);
    목록.push(단락.예화, 단락.적용);
  }
  return 목록;
}

function 주소모으기(구조체) {
  const 주소들 = [];
  for (const 성구 of 구조체.성구 ?? []) if (성구.주소) 주소들.push(성구.주소);
  for (const 단락 of 구조체.단락 ?? []) for (const 주소 of 단락.성구주소 ?? []) 주소들.push(주소);
  for (const 문장 of 모델산문들(구조체)) {
    for (const m of String(문장 ?? '').matchAll(자리표시자)) 주소들.push(m[1].trim());
  }
  if (구조체.주제성구?.주소) 주소들.push(구조체.주제성구.주소);
  return [...new Set(주소들)];
}

function 자리표시자치환(문장, 본문맵) {
  return String(문장 ?? '').replace(자리표시자, (전체, 주소) => {
    const 본문 = 본문맵.get(주소.trim());
    return 본문 ? `“${본문}”` : 전체;
  });
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
    말: 자리표시자치환(대사.말, 본문맵),
  }));

  const 단락 = (구조체.단락 ?? []).map(단락 => ({
    ...단락,
    요점: (단락.요점 ?? []).map(요점 => 자리표시자치환(요점, 본문맵)),
    예화: 자리표시자치환(단락.예화, 본문맵),
    적용: 자리표시자치환(단락.적용, 본문맵),
  }));

  const 주제성구 = 구조체.주제성구?.주소
    ? { 주소: 구조체.주제성구.주소, 본문: 본문맵.get(구조체.주제성구.주소) ?? '' }
    : (구조체.주제성구 ?? null);

  return { ...구조체, 대사, 단락, 성구, 주제성구, 경고 };
}

export function 모델성구검사(구조체) {
  const 위반 = [];
  const 단락위반 = new Set();

  (구조체.대사 ?? []).forEach((대사, i) => {
    for (const m of String(대사.말 ?? '').matchAll(긴인용)) {
      위반.push(`대사 ${i + 1} — 모델이 성구 문장을 직접 썼다 — ${m[1].slice(0, 40)}`);
    }
  });

  // 단락.소제목 은 교재·개요에서 온 원문이라 모델이 쓴 게 아니므로 검사하지 않는다.
  (구조체.단락 ?? []).forEach((단락, i) => {
    const 자리들 = [
      ...(단락.요점 ?? []).map(문장 => ['요점', 문장]),
      ['예화', 단락.예화 ?? ''],
      ['적용', 단락.적용 ?? ''],
    ];
    for (const [자리, 문장] of 자리들) {
      for (const m of String(문장).matchAll(긴인용)) {
        위반.push(`단락 ${i + 1} ${자리} — 모델이 성구 문장을 직접 썼다 — ${m[1].slice(0, 40)}`);
        단락위반.add(i);
      }
    }
  });

  return { 통과: 위반.length === 0, 위반, 단락위반: [...단락위반] };
}

// 교재가 주는 성구는 「렘 29:12, 13」처럼 약칭·범위·쉼표 목록이다. verse-address.mjs 의
// parseReference 는 정식 권 이름과 단일 절만 받아 교재 값을 대부분 못 푼다(직접 실측 확인).
// citation-parse.mjs 의 parseCitation 이 이미 집회 준비 파이프라인에서 이 형태를 풀고 있으므로
// 그것을 쓴다. createTools 가 만들어 주는 text 는 함수가 아니라 { verse(bookNum, chapter, verse) }
// 객체다(src/prep-service.mjs:18, src/bible-text.mjs). scripts/lookup.mjs 가 text.verse(...) 로
// 부르는 모양을 그대로 따른다. 여러 절이면 본문을 이어 붙인다.
export function 성구읽기만들기(루트) {
  const { index, text } = createTools(루트);
  return 주소 => {
    try {
      const 해석 = parseCitation(index, 주소);
      if (!해석?.성공) return null;
      const 본문들 = (해석.주소들 ?? [])
        .map(a => text.verse(a.book, a.chapter, a.verse))
        .filter(Boolean);
      return 본문들.length ? 본문들.join(' ') : null;
    } catch {
      return null;
    }
  };
}
