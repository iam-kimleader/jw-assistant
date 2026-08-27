// 준비 자료 API 의 응답 모양과 호출을 한곳에 모은다.
import type { 프로필 } from './talk-api';

export type 성구묶음 = {
  라벨: string;
  낭독: boolean;
  본문: { 주소: string; 본문: string }[];
};

export type 참고출판물 = {
  url?: string;
  원문URL?: string;
  표시?: string;
  제목?: string;
  출판물?: string;
};

export type 답변 = {
  id: string;
  번호: string;
  질문: string;
  상위질문: string;
  소제목: string;
  문단번호: (number | string)[];
  답변: string;
  참고출판물: 참고출판물[];
  성구: 성구묶음[];
};

export type 구역 = { id: string; title: string; warning?: string; answers: 답변[] };

export type 준비결과 = {
  title: string;
  subtitle?: string;
  sourceUrl?: string | null;
  generation?: { warning?: string };
  answers?: 답변[];
  sections?: 구역[];
  보관?: { 만든때: string | null; 새로만듦: boolean };
};

export type 주간 = { value: string; label: string; current: boolean };

export type 준비종류 = 'life-ministry' | 'watchtower';

export class 로그인필요오류 extends Error {
  constructor() {
    super('로그인이 필요합니다.');
    this.name = '로그인필요오류';
  }
}

// 서버는 실패를 200 + { error } 로도 돌려준다. 두 경우를 같은 자리에서 잡는다.
async function 요청<T>(url: string, 설정?: RequestInit): Promise<T> {
  const response = await fetch(url, 설정);
  if (response.status === 401) throw new 로그인필요오류();
  const data = await response.json();
  if (!response.ok || data?.error) throw new Error(data?.error || '요청에 실패했습니다.');
  return data as T;
}

export function 주간목록() {
  return 요청<{
    today: string;
    weeks: 주간[];
    사용자: { 닉네임: string };
    설정: 프로필;
  }>('/api/options');
}

export function 준비자료(종류: 준비종류, 날짜: string) {
  return 요청<준비결과>(`/api/${종류}?date=${encodeURIComponent(날짜)}`);
}

export function 다시만들기(종류: 준비종류, 날짜: string) {
  // 돈 드는 동작이라 POST 다. GET 에 두면 새로고침만으로도 호출이 나간다.
  return 요청<준비결과>(`/api/${종류}?date=${encodeURIComponent(날짜)}`, { method: 'POST' });
}

export function 설정저장하기(설정: 프로필) {
  return 요청<{ 저장됨: boolean }>('/api/my-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 설정 }),
  });
}
