// Vercel에서 세션 쿠키를 지우는 어댑터
import { 설정읽기, 세션쿠키이름 } from '../src/auth-runtime.mjs';
import { 쿠키지우기 } from '../src/session.mjs';

export default function handler(_req, res) {
  res.setHeader('Set-Cookie', 쿠키지우기(세션쿠키이름, 설정읽기()));
  res.status(200).json({ 나감: true });
}
