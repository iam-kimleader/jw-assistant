// Vercel에서 카카오 인가 화면으로 보내는 어댑터
import { 인증가져오기, 설정읽기, 상태쿠키이름, 짧은쿠키수명초 } from '../src/auth-runtime.mjs';
import { 쿠키만들기 } from '../src/session.mjs';

export default function handler(_req, res) {
  const { 위치, state } = 인증가져오기().로그인시작();
  res.setHeader('Set-Cookie', 쿠키만들기(상태쿠키이름, state, 짧은쿠키수명초, 설정읽기()));
  res.writeHead(302, { Location: 위치 }).end();
}
