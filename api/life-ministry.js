// Vercel에서 생활과 봉사 준비 자료를 제공하는 Serverless Function
import { prepareLifeAndMinistry } from '../src/prep-service.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  try {
    const date = new URL(req.url, 'http://localhost').searchParams.get('date');
    res.status(200).json(await prepareLifeAndMinistry(date, process.cwd()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default 가드(handler);
