// 연설 화면의 시간·파일이름 표기 규칙. 순수 함수만 둔다.

export function 분초표시(초) {
  const 값 = Math.max(0, Math.round(초 || 0));
  return `${Math.floor(값 / 60)}분 ${값 % 60}초`;
}

// 파일 이름에 못 쓰는 글자를 걷어내고 길이를 자른다.
export function 파일이름(날짜, 제목, 산출물) {
  const 안전한제목 = String(제목).replace(/[\/:*?"<>|]/g, '').slice(0, 40);
  return `${날짜}-${안전한제목}-${산출물}.md`;
}

// 구간이 겹치거나 순서가 흐트러져도 가장 늦은 끝이 곧 전체 길이다.
export function 구간합계(구간들) {
  const 목록 = 구간들 ?? [];
  return 목록.length ? Math.max(...목록.map(x => Number(x.끝초) || 0)) : 0;
}

export function 시간요약(시간) {
  if (!시간) return null;
  if (시간.초과 > 0) {
    const 축약문 = (시간.축약적용 ?? []).map(x => `${x.순위}단계 축약 시 ${분초표시(x.총초)}`).join(', ');
    return {
      경고: true,
      글: `예상 ${분초표시(시간.총초)}로 배정(${분초표시(시간.배정초)})보다 ${분초표시(시간.초과)} 초과입니다.${축약문 ? ` ${축약문}.` : ''}`,
    };
  }
  return { 경고: false, 글: `예상 ${분초표시(시간.총초)} · 배정 ${분초표시(시간.배정초)}.` };
}
