// Vercel에서 주간 선택 옵션을 제공하는 Serverless Function
import { buildWeekOptions, localToday } from '../src/web-options.mjs';
import { 가드 } from '../src/api-guard.mjs';

function handler(req, res) {
  res.status(200).json({
    today: localToday().toISOString().slice(0, 10),
    weeks: buildWeekOptions(),
    사용자: { 닉네임: req.사용자.닉네임 },
  });
}

export default 가드(handler);
