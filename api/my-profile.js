// Vercel에서 내 설정을 저장하는 어댑터
import { 인증가져오기 } from '../src/auth-runtime.mjs';
import { 가드 } from '../src/api-guard.mjs';

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: '허용되지 않는 방식입니다.' });
    return;
  }
  try {
    await 인증가져오기().설정쓰기(req.사용자.회원번호, req.body?.설정 ?? {});
    res.status(200).json({ 저장됨: true });
  } catch {
    res.status(500).json({ error: '설정을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주십시오.' });
  }
}

export default 가드(handler);
