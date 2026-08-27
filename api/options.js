// Vercel에서 주간 선택 옵션과 내 설정을 제공하는 Serverless Function
import { buildWeekOptions, localToday } from '../src/web-options.mjs';
import { 인증가져오기 } from '../src/auth-runtime.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  res.status(200).json({
    today: localToday().toISOString().slice(0, 10),
    weeks: buildWeekOptions(),
    사용자: { 닉네임: req.사용자.닉네임 },
    설정: await 인증가져오기().설정읽기(req.사용자.회원번호),
  });
}

export default 가드(handler);
