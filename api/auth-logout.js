// Vercel에서 세션 쿠키를 지우는 어댑터
import { 설정읽기, 세션쿠키이름 } from '../src/auth-runtime.mjs';
import { 쿠키지우기 } from '../src/session.mjs';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: '허용되지 않는 방식입니다.' });
    return;
  }

  res.setHeader('Set-Cookie', 쿠키지우기(세션쿠키이름, 설정읽기()));
  res.status(200).json({ 나감: true });
}
