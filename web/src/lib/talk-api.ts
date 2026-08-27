// 연설 화면이 쓰는 API 의 응답 모양과 호출을 모은다.
import { 로그인필요오류 } from './api';

export type 프로필 = {
  성별: string;
  연령: number;
  임명: string;
  파이오니아: boolean;
  스타일: string;
  문체견본: string;
  분당글자수: number;
};

// 서버가 준 배정을 뼈대 요청에 그대로 되돌려 보내야 해서 모르는 항목도 함께 들고 다닌다.
export type 배정 = {
  절: string;
  제목: string;
  종류: string;
  시간초: number;
  봉사형태?: string;
  설명?: string;
  가능: boolean;
  사유?: string;
} & Record<string, unknown>;

export type 구간 = { 이름: string; 시작초: number; 끝초: number; 목적: string };
export type 뼈대 = { 배정시간: number; 구간: 구간[] } & Record<string, unknown>;

export type 산출물키 = '준비원고' | '낭독대본' | '큐카드' | '점검표';
export const 산출물목록: 산출물키[] = ['준비원고', '낭독대본', '큐카드', '점검표'];
export const 산출물이름: Record<산출물키, string> = {
  준비원고: '준비용 원고',
  낭독대본: '낭독용 대본',
  큐카드: '연단 큐카드',
  점검표: '자기 점검표',
};

export type 시간정보 = {
  총초: number;
  배정초: number;
  초과: number;
  축약적용?: { 순위: number; 총초: number }[];
};

export type 공개강연입력 = {
  제목: string;
  주제성구: string;
  배정시간: number;
  소제목: { 문장: string }[];
};

async function 요청<T>(url: string, 설정?: RequestInit): Promise<T> {
  const response = await fetch(url, 설정);
  if (response.status === 401) throw new 로그인필요오류();
  const data = await response.json();
  if (!response.ok || data?.error) throw new Error(data?.error || '요청에 실패했습니다.');
  return data as T;
}

function 보내기<T>(url: string, 본문: unknown) {
  return 요청<T>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(본문),
  });
}

export function 배정가져오기(날짜: string, 프로필: 프로필) {
  const 질의 = `date=${encodeURIComponent(날짜)}&profile=${encodeURIComponent(JSON.stringify(프로필))}`;
  return 요청<{ 배정: 배정[]; 공개강연카드: 배정 | null }>(`/api/talk-assignments?${질의}`);
}

export function 뼈대만들기(본문: { 배정: 배정; 프로필: 프로필; 공개강연입력?: 공개강연입력 }) {
  return 보내기<{ 뼈대: 뼈대; 생성?: { warning?: string } }>('/api/talk-outline', 본문);
}

export function 원고만들기(본문: { 뼈대: 뼈대; 프로필: 프로필 }) {
  return 보내기<{
    구조체: { 경고?: string[] };
    산출물: Record<산출물키, string>;
    시간: 시간정보;
    생성?: { warning?: string };
  }>('/api/talk-draft', 본문);
}
