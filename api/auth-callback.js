// Vercel에서 카카오 인가 코드를 받아 세션을 발급하는 어댑터
import {
  인증가져오기, 설정읽기, 세션쿠키이름, 상태쿠키이름, 신원쿠키이름, 짧은쿠키수명초,
} from '../src/auth-runtime.mjs';
import { 세션만들기, 쿠키만들기, 쿠키지우기, 쿠키읽기 } from '../src/session.mjs';

const 서른일 = 30 * 24 * 60 * 60;

export default async function handler(req, res) {
  const 설정 = 설정읽기();
  const 주소 = new URL(req.url, `http://${req.headers.host}`);
  const 결과 = await 인증가져오기().로그인완료({
    code: 주소.searchParams.get('code'),
    state: 주소.searchParams.get('state'),
    저장된state: 쿠키읽기(req.headers.cookie, 상태쿠키이름),
    오류: 주소.searchParams.get('error'),
    오류설명: 주소.searchParams.get('error_description'),
  });

  const 지울상태 = 쿠키지우기(상태쿠키이름, 설정);

  if (결과.결과 === '승인') {
    const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
    res.setHeader('Set-Cookie', [지울상태, 쿠키만들기(세션쿠키이름, 세션, 서른일, 설정)]);
    res.writeHead(302, { Location: '/' }).end();
    return;
  }

  if (결과.결과 === '초대필요') {
    // 초대 화면으로 넘길 신원만 짧게 들고 간다. 용도가 '신원'이라 세션으로 읽히지 않는다.
    const 신원 = 세션만들기(결과.신원, 설정.세션비밀, Date.now(), 짧은쿠키수명초, '신원');
    res.setHeader('Set-Cookie', [지울상태, 쿠키만들기(신원쿠키이름, 신원, 짧은쿠키수명초, 설정)]);
    res.writeHead(302, { Location: '/invite' }).end();
    return;
  }

  res.setHeader('Set-Cookie', 지울상태);
  res.writeHead(302, { Location: `/login?오류=${encodeURIComponent(결과.사유 ?? '')}` }).end();
}
