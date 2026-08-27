// 환경 변수로 인증 부품을 조립한다. 어댑터가 공통으로 가져다 쓴다.
import { randomBytes } from 'node:crypto';
import * as blob from '@vercel/blob';
import { 인증만들기 } from './auth-service.mjs';
import { 저장소만들기 } from './store.mjs';
import { 인가주소, 토큰받기, 사용자정보 } from './kakao-auth.mjs';
import { 세션읽기, 쿠키읽기 } from './session.mjs';

export const 세션쿠키이름 = 'jw_session';
export const 상태쿠키이름 = 'jw_state';
export const 신원쿠키이름 = 'jw_pending';
export const 짧은쿠키수명초 = 600;

export function 설정읽기() {
  const 기본주소 = String(process.env.APP_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
  return {
    restApiKey: process.env.KAKAO_REST_API_KEY ?? '',
    clientSecret: process.env.KAKAO_CLIENT_SECRET ?? '',
    redirectUri: `${기본주소}/api/auth-callback`,
    초대코드: process.env.INVITE_CODE ?? '',
    세션비밀: process.env.SESSION_SECRET ?? '',
    // 로컬은 http 라 Secure 를 붙이면 브라우저가 쿠키를 돌려주지 않는다.
    보안: Boolean(process.env.VERCEL),
  };
}

// 함수 인스턴스가 살아 있는 동안 재사용한다. 기존 talk-draft.js 와 같은 방식이다.
let 캐시된인증 = null;

export function 인증가져오기() {
  return (캐시된인증 ??= 인증만들기({
    설정: 설정읽기(),
    카카오: { 인가주소, 토큰받기, 사용자정보 },
    저장소: 저장소만들기(blob),
    무작위: () => randomBytes(16).toString('base64url'),
  }));
}

export function 요청사용자(쿠키헤더) {
  const 값 = 쿠키읽기(쿠키헤더, 세션쿠키이름);
  if (!값) return null;
  return 세션읽기(값, 설정읽기().세션비밀);
}
