// Vercel 서버리스에서 연설 원고를 만드는 어댑터
import { 환경만들기, 원고준비 } from '../src/talk-service.mjs';
import { 가드 } from '../src/api-guard.mjs';

// 환경만들기 가 성경 인덱스를 새로 읽는 데 요청당 150~175ms 걸린다(src/web-server.mjs 실측 주석 참고).
// Vercel 서버리스도 함수 인스턴스가 재사용되는 동안은 모듈 스코프가 살아 있으므로 한 번만 만들어 재사용한다.
let 캐시된환경 = null;
function 환경가져오기() {
  return 캐시된환경 ??= 환경만들기(process.cwd());
}

async function handler(req, res) {
  try {
    res.status(200).json(await 원고준비(req.body ?? {}, 환경가져오기()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default 가드(handler);
