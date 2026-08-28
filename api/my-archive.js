// Vercel에서 보관함 목록을 돌려주는 어댑터
import * as blob from '@vercel/blob';
import { 저장소만들기 } from '../src/store.mjs';
import { 보관목록 } from '../src/archive.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  try {
    res.status(200).json(await 보관목록({
      저장소: 저장소만들기(blob),
      회원번호: req.사용자.회원번호,
    }));
  } catch {
    res.status(500).json({ error: '보관함을 불러오지 못했습니다. 잠시 뒤 다시 시도해 주십시오.' });
  }
}

export default 가드(handler);
