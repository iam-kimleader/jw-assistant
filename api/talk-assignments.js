// Vercel 서버리스에서 연설 배정 목록을 돌려주는 어댑터
import { 배정목록 } from '../src/talk-service.mjs';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const 프로필 = JSON.parse(url.searchParams.get('profile') ?? 'null');
    const 결과 = await 배정목록({ 날짜: url.searchParams.get('date'), 프로필: 프로필 ?? undefined });
    res.status(200).json(결과);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
