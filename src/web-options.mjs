// 준비 화면 날짜 선택에 쓸 주간 옵션을 만드는 모듈
import { weekStart } from './wol-week.mjs';

const 하루 = 86400000;

function 날짜값(date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function localToday() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

export function weekEnd(startDateText) {
  const d = new Date(`${startDateText}T00:00:00Z`);
  return new Date(d.getTime() + 6 * 하루).toISOString().slice(0, 10);
}

export function buildWeekOptions(baseDate = localToday(), before = 10, after = 10) {
  const base = new Date(`${weekStart(날짜값(baseDate))}T00:00:00Z`);
  const out = [];
  for (let i = -before; i <= after; i++) {
    const start = new Date(base.getTime() + i * 7 * 하루).toISOString().slice(0, 10);
    const end = weekEnd(start);
    out.push({ value: start, label: `${start} ~ ${end}`, current: i === 0 });
  }
  return out;
}
