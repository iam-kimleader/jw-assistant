// 원고 구조체의 성구를 로컬 본문으로만 채우고 모델의 성구 서술을 막는 모듈
import { parseCitation } from './citation-parse.mjs';
import { createTools } from './prep-service.mjs';

const 자리표시자 = /\{\{성구:([^}]+)\}\}/g;
// 길이로는 위조를 가려낼 수 없다(실측). 실제 원고에서 정당한 인용이 139자까지 있고
// 진짜 성구 인용은 95자다. 대신 인용부호 구간 바로 앞에 성구 주소가 붙어 있는지로
// 가린다. 주소 뒤에 조사 「은·는·:」 만 두고 바로 인용부호가 오면 "그 성구는 이렇게
// 말한다"는 주장이므로 로컬 본문과 대조한다. 「…을/를 근거로 든다」처럼 주소가 목적어로
// 쓰이면(조사가 을·를) 그 인용문이 성구 본문이라는 주장이 아니므로 대조하지 않는다.
const 인용구간 = /[“"]([^”"]+)[”"]/g;
const 직전주소 = /([가-힣]+\s?\d{1,3}\s*:\s*[\d,\s-]+)\s*[는은:]?\s*$/;

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

// 성구 본문이 이미 “ 나 ” 로 시작·끝나면(절 자체가 인용을 담고 있으면) 감쌀 때
// 따옴표가 겹친다("…채찍질하신다.””"). 이미 있는 쪽은 더하지 않는다.
export function 인용으로감싸기(본문) {
  const 시작 = /^[“"]/.test(본문) ? '' : '“';
  const 끝 = /[”"]$/.test(본문) ? '' : '”';
  return `${시작}${본문}${끝}`;
}

function 자리표시자치환(문장, 본문맵) {
  return String(문장 ?? '').replace(자리표시자, (전체, 주소) => {
    const 본문 = 본문맵.get(주소.trim());
    return 본문 ? 인용으로감싸기(본문) : 전체;
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

const 공백제거 = s => String(s ?? '').replace(/\s/g, '');

// 인용부호 구간 하나를 검사한다. 그 앞 60자 안에서 성구 주소가 바로 붙어 있을 때만
// (즉 인용부호 구간과 「같은 문자열」 안에 주소가 함께 있을 때만) 대조한다. 주소가
// 멀리 떨어진 다른 문장에 있거나 인용부호 안쪽에 있을 뿐이면(예: 팜플렛이 절 번호를
// 인용문 안에서 언급하는 경우) 대조하지 않는다 — 정당한 인용까지 막기 때문이다.
function 인용위반(문장, 읽기) {
  const 위반 = [];
  for (const m of String(문장 ?? '').matchAll(인용구간)) {
    const 앞 = 문장.slice(Math.max(0, m.index - 60), m.index);
    const 짝 = 앞.match(직전주소);
    if (!짝) continue;

    let 본문 = null;
    try {
      본문 = 읽기(짝[1].trim());
    } catch {
      본문 = null;
    }
    if (!본문) continue;

    const 인용문 = 공백제거(m[1]);
    const 로컬 = 공백제거(본문);
    if (!로컬.includes(인용문) && !인용문.includes(로컬)) {
      위반.push(`모델이 성구 문장을 직접 썼다 — ${m[1].slice(0, 40)}`);
    }
  }
  return 위반;
}

// 읽기 가 없으면 대조할 로컬 본문이 없으므로 아무것도 거절하지 않는다.
export function 모델성구검사(구조체, 읽기) {
  const 위반 = [];
  const 단락위반 = new Set();

  if (읽기) {
    (구조체.대사 ?? []).forEach((대사, i) => {
      for (const 문구 of 인용위반(대사.말, 읽기)) 위반.push(`대사 ${i + 1} — ${문구}`);
    });

    // 단락.소제목 은 교재·개요에서 온 원문이라 모델이 쓴 게 아니므로 검사하지 않는다.
    (구조체.단락 ?? []).forEach((단락, i) => {
      const 자리들 = [
        ...(단락.요점 ?? []).map(문장 => ['요점', 문장]),
        ['예화', 단락.예화 ?? ''],
        ['적용', 단락.적용 ?? ''],
      ];
      for (const [자리, 문장] of 자리들) {
        for (const 문구 of 인용위반(문장, 읽기)) {
          위반.push(`단락 ${i + 1} ${자리} — ${문구}`);
          단락위반.add(i);
        }
      }
    });
  }

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
