// Vercel에서 저장된 연설 자료를 하나 돌려주는 어댑터
import * as blob from '@vercel/blob';
import { 저장소만들기 } from '../src/store.mjs';
import { 연설읽기 } from '../src/talk-store.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  try {
    const 질의 = new URL(req.url, 'http://localhost').searchParams;
    const 자료 = await 연설읽기({
      저장소: 저장소만들기(blob),
      회원번호: req.사용자.회원번호,
      주간: 질의.get('주간'),
      배정번호: Number(질의.get('배정번호')),
      배정제목: 질의.get('제목'),
    });
    res.status(200).json({ 자료 });
  } catch {
    // 모양이 틀린 요청이다. 저장된 게 없는 것과 같이 다뤄 화면을 막지 않는다.
    res.status(200).json({ 자료: null });
  }
}

export default 가드(handler);
