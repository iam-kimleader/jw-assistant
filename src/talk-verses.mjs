// 원고 구조체의 성구를 로컬 본문으로만 채우고 모델의 성구 서술을 막는 모듈
import { join } from 'node:path';
import { parseCitation } from './citation-parse.mjs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';

const 자리표시자 = /\{\{성구:([^}]+)\}\}/g;
// 길이로는 위조를 가려낼 수 없다(실측). 실제 원고에서 정당한 인용이 139자까지 있고
// 진짜 성구 인용은 95자다. 대신 인용부호 구간과 같은 문자열(또는 대사라면 바로 앞
// 대사) 안에 성구 주소가 있는지로 가린다. 성구를 낭독하는 가장 자연스러운 형태가
// "예레미야 29장 11절인데, 읽어 드릴까요." → (다음 대사에서) 인용, 이기 때문이다.
// 조사는 은·는·이·가·을·를 등 무엇이든 상관하지 않는다 — 주소가 인용부호 앞
// 어딘가에 있으면 그 인용을 그 절의 주장으로 본다. 주소가 인용부호 안쪽에만 있으면
// (팜플렛이 절 번호를 인용문 안에서 언급하는 경우) 대조하지 않는다.
const 인용구간 = /[“"]([^”"]+)[”"]/g;
const 콜론주소 = /[가-힣]+\s?\d{1,3}\s*:\s*[\d,\s-]+/g;
// parseCitation(citation-parse.mjs) 은 "29장 11절" 꼴을 해석하지 못한다(직접 확인 —
// 정규식이 `장:절` 콜론만 받는다). 그래서 여기서 "29:11" 꼴로 바꿔 넘긴다.
const 장절주소 = /([가-힣]+)\s?(\d{1,3})\s*장\s*([\d,\s-]+?)\s*절/g;

// 텍스트 안의 성구 주소 후보를 왼쪽에서 오른쪽 순서로 뽑는다(콜론·장절 표기 둘 다).
function 주소후보들(텍스트) {
  const 후보 = [];
  for (const m of 텍스트.matchAll(콜론주소)) 후보.push({ 위치: m.index, 주소: m[0].trim() });
  for (const m of 텍스트.matchAll(장절주소)) 후보.push({ 위치: m.index, 주소: `${m[1]} ${m[2]}:${m[3]}`.trim() });
  return 후보.sort((a, b) => a.위치 - b.위치).map(x => x.주소);
}

// 후보 중 실제로 읽기 가 본문을 돌려주는 것을 뒤(인용부호에 가까운 쪽)에서부터 찾는다.
function 해석되는주소(후보들, 읽기) {
  for (let i = 후보들.length - 1; i >= 0; i--) {
    let 본문 = null;
    try {
      본문 = 읽기(후보들[i]);
    } catch {
      본문 = null;
    }
    if (본문) return 본문;
  }
  return null;
}

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

function 어긋남(인용문, 본문) {
  const 압축인용 = 공백제거(인용문);
  const 압축본문 = 공백제거(본문);
  return !압축본문.includes(압축인용) && !압축인용.includes(압축본문);
}

// 인용부호 구간 하나를 검사한다. 같은 문자열의 앞 60자 안에서 주소를 먼저 찾고,
// 없으면(대사만) 앞선문맥(바로 앞 대사의 말) 전체에서 찾는다. 두 곳 다 없으면
// (또는 주소가 인용부호 안쪽에만 있으면) 대조하지 않는다 — 정당한 인용까지 막기
// 때문이다. 두 칸 이상 떨어진 주소는 보지 않는다 — 그러면 정당한 대화까지 막힌다.
function 인용위반들(문장, 읽기, 앞선문맥 = '') {
  const 위반 = [];
  const 문자열 = String(문장 ?? '');
  for (const m of 문자열.matchAll(인용구간)) {
    const 앞 = 문자열.slice(Math.max(0, m.index - 60), m.index);
    let 본문 = 해석되는주소(주소후보들(앞), 읽기);
    if (본문 == null && 앞선문맥) 본문 = 해석되는주소(주소후보들(앞선문맥), 읽기);
    if (본문 == null) continue;

    if (어긋남(m[1], 본문)) {
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
    const 대사들 = 구조체.대사 ?? [];
    대사들.forEach((대사, i) => {
      const 앞선문맥 = i > 0 ? String(대사들[i - 1].말 ?? '') : '';
      for (const 문구 of 인용위반들(대사.말, 읽기, 앞선문맥)) 위반.push(`대사 ${i + 1} — ${문구}`);
    });

    // 단락.소제목 은 교재·개요에서 온 원문이라 모델이 쓴 게 아니므로 검사하지 않는다.
    // 단락은 대사와 달리 앞뒤 순서로 이어 말하는 구조가 아니므로 같은 문자열만 본다.
    (구조체.단락 ?? []).forEach((단락, i) => {
      const 자리들 = [
        ...(단락.요점 ?? []).map(문장 => ['요점', 문장]),
        ['예화', 단락.예화 ?? ''],
        ['적용', 단락.적용 ?? ''],
      ];
      for (const [자리, 문장] of 자리들) {
        for (const 문구 of 인용위반들(문장, 읽기)) {
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
// 그것을 쓴다. text 는 함수가 아니라 { verse(bookNum, chapter, verse) } 객체다(src/bible-text.mjs).
// scripts/lookup.mjs 가 text.verse(...) 로 부르는 모양을 그대로 따른다. 여러 절이면 본문을 이어
// 붙인다. prep-service.mjs 의 createTools 는 상호참조(loadRefs, 66개 파일 1.4MB)까지 함께
// 읽는데 연설 준비는 상호참조를 쓰지 않으므로 index 와 본문 리더만 직접 만든다(콜드 스타트 절감).
export function 성구읽기만들기(루트) {
  const index = loadIndex(join(루트, 'core/bible/index.json'));
  const text = createTextReader(index, join(루트, 'core/bible/text'));
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
