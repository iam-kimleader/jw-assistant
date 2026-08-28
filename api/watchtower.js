// Vercel에서 파수대 연구 준비 자료를 제공하는 Serverless Function
import * as blob from '@vercel/blob';
import { prepareWatchtower } from '../src/prep-service.mjs';
import { 저장소만들기 } from '../src/store.mjs';
import { 주간자료가져오기 } from '../src/week-cache.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  try {
    const 날짜 = new URL(req.url, 'http://localhost').searchParams.get('date');
    const { 자료, 만든때, 새로만듦 } = await 주간자료가져오기({
      종류: 'watchtower',
      날짜,
      저장소: 저장소만들기(blob),
      만들기: 주간 => prepareWatchtower(주간, process.cwd()),
      // 돈 드는 동작을 GET 에 두지 않는다. 새로고침이나 미리 가져오기로 나가면 안 된다.
      다시만들기: req.method === 'POST',
    });
    res.status(200).json({ ...자료, 보관: { 만든때, 새로만듦 } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default 가드(handler);
