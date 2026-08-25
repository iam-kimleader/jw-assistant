// 원고의 낭독 시간을 글자 수로 계산하고 축약 효과를 보고하는 모듈
export const 기본설정 = { 분당글자수: 320, 성구계수: 0.85, 동작초: 1.5 };

function 글자수(문장) {
  return String(문장 ?? '').replace(/\s/g, '').length;
}

function 초로(수, 분당글자수) {
  return 수 / (분당글자수 / 60);
}

const 공백제거 = s => String(s ?? '').replace(/\s/g, '');

// 성구채우기(talk-verses.mjs)가 {{성구:…}} 자리표시자를 대사.말 이나 단락 산문에
// 이미 로컬 본문으로 바꿔 넣었으면, 그 본문은 대사/단락 글자 수를 셀 때 이미
// 포함됐다. 성구 배열에서 또 세면 같은 낭독을 두 번 계산한다(렘 29:11 기준 실측
// 약 22초, 4분 배정의 9%).
export function 이미포함됨(성구본문, 구조체) {
  const 대상 = 공백제거(성구본문);
  if (!대상) return false;
  for (const 대사 of 구조체.대사 ?? []) if (공백제거(대사.말).includes(대상)) return true;
  for (const 단락 of 구조체.단락 ?? []) {
    if (공백제거(단락.예화).includes(대상) || 공백제거(단락.적용).includes(대상)) return true;
    for (const 요점 of 단락.요점 ?? []) if (공백제거(요점).includes(대상)) return true;
  }
  return false;
}

function 축약된대상(구조체, 순위) {
  const 지울것 = new Set(
    (구조체.축약순서 ?? []).filter(x => x.순위 <= 순위).map(x => x.대상),
  );
  const 남은대사 = (구조체.대사 ?? []).filter(x => !지울것.has(x.구간) && !지울것.has(x.말));
  // 교재와 개요에서 온 단락은 문장을 고치지 않으므로 축약하지 않는다.
  const 남은단락 = (구조체.단락 ?? []).filter(
    x => x.출처 !== '생성' ? true : !지울것.has(x.소제목),
  );
  return { ...구조체, 대사: 남은대사, 단락: 남은단락 };
}

export function 추정초(구조체, 설정 = 기본설정) {
  const { 분당글자수, 성구계수, 동작초 } = { ...기본설정, ...설정 };
  let 초 = 0;

  for (const 대사 of 구조체.대사 ?? []) {
    초 += 초로(글자수(대사.말), 분당글자수);
    if (String(대사.동작 ?? '').trim()) 초 += 동작초;
  }

  for (const 단락 of 구조체.단락 ?? []) {
    const 수 = 글자수(단락.소제목) + (단락.요점 ?? []).reduce((합, x) => 합 + 글자수(x), 0)
      + 글자수(단락.예화) + 글자수(단락.적용);
    초 += 초로(수, 분당글자수);
  }

  for (const 성구 of 구조체.성구 ?? []) {
    if (이미포함됨(성구.본문, 구조체)) continue;
    초 += 초로(글자수(성구.본문), 분당글자수 * 성구계수);
  }

  return Math.round(초);
}

export function 시간보고(구조체, 설정 = 기본설정) {
  const 총초 = 추정초(구조체, 설정);
  const 순위들 = [...new Set((구조체.축약순서 ?? []).map(x => x.순위))].sort((가, 나) => 가 - 나);
  return {
    총초,
    배정초: 구조체.배정시간 ?? 0,
    초과: 총초 - (구조체.배정시간 ?? 0),
    축약적용: 순위들.map(순위 => ({ 순위, 총초: 추정초(축약된대상(구조체, 순위), 설정) })),
  };
}

export function 분초표기(초) {
  const 값 = Math.max(0, Math.round(초));
  return `${Math.floor(값 / 60)}분 ${값 % 60}초`;
}
