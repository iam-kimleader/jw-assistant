// Vercel에서 주간 선택 옵션을 제공하는 Serverless Function
import { buildWeekOptions, localToday } from '../src/web-options.mjs';

export default function handler(_req, res) {
  res.status(200).json({
    today: localToday().toISOString().slice(0, 10),
    weeks: buildWeekOptions(),
  });
}
