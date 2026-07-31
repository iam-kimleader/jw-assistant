// 날짜로 그 주의 wol 집회 페이지를 찾아 파수대 연구 기사 docId 를 얻는 모듈
const 하루 = 86400000;

// 요일을 월=1 … 일=7 로 센다
function 요일(d) {
  return d.getUTCDay() === 0 ? 7 : d.getUTCDay();
}

function 월요일(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return new Date(d.getTime() - (요일(d) - 1) * 하루);
}

export function isoWeek(date) {
  // 그 주 목요일이 속한 해가 ISO 기준 연도다
  const 목 = new Date(월요일(date).getTime() + 3 * 하루);
  const 첫목 = new Date(Date.UTC(목.getUTCFullYear(), 0, 4));
  const 첫주월 = 월요일(첫목);
  const week = Math.round((목.getTime() - 첫주월.getTime()) / (7 * 하루)) + 1;
  return { year: 목.getUTCFullYear(), week };
}

export function weekStart(date) {
  return 월요일(date).toISOString().slice(0, 10);
}

export function weekPageUrl(year, week) {
  return `https://wol.jw.org/ko/wol/meetings/r8/lp-ko/${year}/${week}`;
}

export function articleUrl(docId) {
  return `https://wol.jw.org/ko/wol/d/r8/lp-ko/${docId}`;
}

// class 목록에 docId-… 가 있는 항목을 모두 훑는다.
// 파수대는 pub-w 라는 낱말이 통째로 들어 있고, 교재는 pub-mwb… 라 걸리지 않는다.
export function parseWeekPage(html) {
  let 파수대docId = null;
  let 교재docId = null;
  const re = /class="([^"]*\bdocId-(\d+)\b[^"]*)"/g;
  let m;
  while ((m = re.exec(html))) {
    const 목록 = m[1].split(/\s+/);
    if (목록.includes('pub-w')) 파수대docId ??= m[2];
    else if (목록.some(c => c.startsWith('pub-mwb'))) 교재docId ??= m[2];
  }
  if (!파수대docId) throw new Error('주간 집회 페이지에서 파수대 기사를 찾을 수 없다');
  return { 파수대docId, 교재docId };
}
