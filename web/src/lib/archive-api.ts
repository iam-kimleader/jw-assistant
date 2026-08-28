// 보관함 목록을 받고 연설 자료를 지운다.
import { 요청, type 준비종류 } from './api';

export type 보관연구답변 = { 종류: 준비종류; 주간: string };
export type 보관연설 = {
  주간: string;
  배정번호: number;
  배정제목: string;
  만든때: string | null;
};

export function 보관함목록() {
  return 요청<{ 연구답변: 보관연구답변[]; 연설: 보관연설[] }>('/api/my-archive');
}

export function 연설지우기(주간: string, 배정번호: number) {
  const 질의 = new URLSearchParams({ 주간, 배정번호: String(배정번호) });
  return 요청<{ 지움: boolean }>(`/api/my-talk?${질의}`, { method: 'DELETE' });
}
