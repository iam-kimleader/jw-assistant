// Vercel 서버리스에서 연설 뼈대를 만드는 어댑터
import * as blob from '@vercel/blob';
import { 환경만들기, 뼈대준비 } from '../src/talk-service.mjs';
import { 저장소만들기 } from '../src/store.mjs';
import { 연설쓰기 } from '../src/talk-store.mjs';
import { 가드 } from '../src/api-guard.mjs';

// 환경만들기 가 성경 인덱스를 새로 읽는 데 요청당 150~175ms 걸린다(src/web-server.mjs 실측 주석 참고).
// Vercel 서버리스도 함수 인스턴스가 재사용되는 동안은 모듈 스코프가 살아 있으므로 한 번만 만들어 재사용한다.
let 캐시된환경 = null;
function 환경가져오기() {
  return 캐시된환경 ??= 환경만들기(process.cwd());
}

async function handler(req, res) {
  try {
    const 몸 = req.body ?? {};
    const 결과 = await 뼈대준비(몸, 환경가져오기());
    await 연설쓰기({
      저장소: 저장소만들기(blob),
      회원번호: req.사용자.회원번호,
      주간: 몸.주간,
      배정번호: 몸.배정번호,
      배정제목: 몸.배정제목,
      내용: { 뼈대: 결과.뼈대 },
    });
    res.status(200).json(결과);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default 가드(handler);
