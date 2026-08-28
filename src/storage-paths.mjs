// 저장소 경로를 만든다. 브라우저가 보낸 글자가 경로가 되지 않도록 여기서 모양을 막는다.
import { weekStart } from './wol-week.mjs';

const 종류목록 = new Set(['watchtower', 'life-ministry']);
// 한 주 배정이 이보다 많을 일이 없다. 터무니없는 값을 여기서 자른다.
const 배정번호상한 = 99;

export function 주간열쇠(날짜) {
  if (typeof 날짜 !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(날짜)) {
    throw new Error('날짜는 YYYY-MM-DD 모양이어야 합니다.');
  }
  const 시각 = new Date(`${날짜}T00:00:00Z`);
  // 2026-02-30 같은 값은 Date 가 다른 날로 넘겨 버린다. 되돌려 비교해야 걸러진다.
  if (Number.isNaN(시각.getTime()) || 시각.toISOString().slice(0, 10) !== 날짜) {
    throw new Error('달력에 없는 날짜입니다.');
  }
  return weekStart(시각);
}

export function 주간경로(종류, 날짜) {
  if (!종류목록.has(종류)) throw new Error('모르는 자료 종류입니다.');
  return `weeks/${종류}/${주간열쇠(날짜)}.json`;
}

function 검사한회원번호(회원번호) {
  if (!/^[0-9]+$/.test(String(회원번호))) throw new Error('회원번호가 숫자 모양이 아닙니다.');
  return String(회원번호);
}

export function 설정경로(회원번호) {
  return `users/${검사한회원번호(회원번호)}/profile.json`;
}

export function 연설경로(회원번호, 날짜, 배정번호) {
  if (!Number.isInteger(배정번호) || 배정번호 < 0 || 배정번호 > 배정번호상한) {
    throw new Error('배정번호가 올바르지 않습니다.');
  }
  return `users/${검사한회원번호(회원번호)}/talks/${주간열쇠(날짜)}-${배정번호}.json`;
}
