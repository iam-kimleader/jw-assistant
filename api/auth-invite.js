// Vercel에서 초대 코드를 확인하고 승인 기록을 남기는 어댑터
import {
  인증가져오기, 설정읽기, 세션쿠키이름, 신원쿠키이름,
} from '../src/auth-runtime.mjs';
import { 세션만들기, 세션읽기, 쿠키만들기, 쿠키지우기, 쿠키읽기 } from '../src/session.mjs';

const 서른일 = 30 * 24 * 60 * 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: '허용되지 않는 방식입니다.' });
    return;
  }

  const 설정 = 설정읽기();
  const 신원 = 세션읽기(쿠키읽기(req.headers.cookie, 신원쿠키이름), 설정.세션비밀, Date.now(), '신원');
  if (!신원) {
    res.status(401).json({ error: '로그인부터 다시 해 주십시오.' });
    return;
  }

  const 결과 = await 인증가져오기().초대확인({ 코드: req.body?.코드 ?? '', 신원 });
  if (결과.저장소오류) {
    res.status(500).json({ error: '저장소에 연결하지 못했습니다. 잠시 뒤 다시 시도해 주십시오.' });
    return;
  }
  if (!결과.통과) {
    res.status(400).json({ error: '초대 코드가 맞지 않습니다.' });
    return;
  }

  const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
  res.setHeader('Set-Cookie', [
    쿠키지우기(신원쿠키이름, 설정),
    쿠키만들기(세션쿠키이름, 세션, 서른일, 설정),
  ]);
  res.status(200).json({ 닉네임: 결과.사용자.닉네임 });
}
