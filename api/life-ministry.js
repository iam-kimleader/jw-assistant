// Vercel에서 생활과 봉사 준비 자료를 제공하는 Serverless Function
import { prepareLifeAndMinistry } from '../src/prep-service.mjs';

export default async function handler(req, res) {
  try {
    const date = new URL(req.url, 'http://localhost').searchParams.get('date');
    res.status(200).json(await prepareLifeAndMinistry(date, process.cwd()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
