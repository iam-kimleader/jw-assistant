// 로그인 세션을 서명 쿠키 하나로 다룬다. 서버에 세션 표를 두지 않는다.
import { createHmac, timingSafeEqual } from 'node:crypto';

const 기본유효기간초 = 30 * 24 * 60 * 60;

function 서명(본문, 비밀) {
  return createHmac('sha256', 비밀).update(본문).digest('base64url');
}

export function 세션만들기(사용자, 비밀, 지금 = Date.now(), 유효기간초 = 기본유효기간초) {
  const 담긴것 = {
    회원번호: String(사용자.회원번호),
    닉네임: String(사용자.닉네임 ?? ''),
    만료: 지금 + 유효기간초 * 1_000,
  };
  const 본문 = Buffer.from(JSON.stringify(담긴것), 'utf8').toString('base64url');
  return `${본문}.${서명(본문, 비밀)}`;
}

export function 세션읽기(값, 비밀, 지금 = Date.now()) {
  if (typeof 값 !== 'string') return null;
  const 조각 = 값.split('.');
  if (조각.length !== 2) return null;
  const [본문, 받은서명] = 조각;
  if (!본문 || !받은서명) return null;

  const 바른서명 = 서명(본문, 비밀);
  // 길이가 다르면 timingSafeEqual 이 던지므로 먼저 본다.
  if (받은서명.length !== 바른서명.length) return null;
  if (!timingSafeEqual(Buffer.from(받은서명), Buffer.from(바른서명))) return null;

  let 담긴것;
  try {
    담긴것 = JSON.parse(Buffer.from(본문, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!담긴것?.만료 || 담긴것.만료 <= 지금) return null;
  return { 회원번호: String(담긴것.회원번호), 닉네임: String(담긴것.닉네임 ?? '') };
}

export function 쿠키만들기(이름, 값, 수명초, { 보안 = true } = {}) {
  const 조각 = [`${이름}=${값}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${수명초}`];
  if (보안) 조각.push('Secure');
  return 조각.join('; ');
}

export function 쿠키지우기(이름, 설정) {
  return 쿠키만들기(이름, '', 0, 설정);
}

export function 쿠키읽기(쿠키헤더, 이름) {
  for (const 조각 of String(쿠키헤더 ?? '').split(';')) {
    const 다듬은것 = 조각.trim();
    const 등호 = 다듬은것.indexOf('=');
    if (등호 < 1) continue;
    if (다듬은것.slice(0, 등호) === 이름) return 다듬은것.slice(등호 + 1);
  }
  return null;
}
