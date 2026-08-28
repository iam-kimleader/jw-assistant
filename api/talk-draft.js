// Vercel 서버리스에서 연설 원고를 만드는 어댑터
import * as blob from '@vercel/blob';
import { 환경만들기, 원고준비 } from '../src/talk-service.mjs';
import { 저장소만들기 } from '../src/store.mjs';
import { 연설쓰기, 저장가능한가 } from '../src/talk-store.mjs';
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
    if (!저장가능한가({ 회원번호: req.사용자.회원번호, 주간: 몸.주간, 배정번호: 몸.배정번호 })) {
      res.status(400).json({ error: '연설을 저장할 자리를 정할 수 없습니다. 화면을 새로 고친 뒤 다시 시도해 주십시오.' });
      return;
    }
    const 결과 = await 원고준비(몸, 환경가져오기());
    // 뼈대도 함께 넣는다. 복원 한 번으로 두 단계가 다 살아나야 한다.
    await 연설쓰기({
      저장소: 저장소만들기(blob),
      회원번호: req.사용자.회원번호,
      주간: 몸.주간,
      배정번호: 몸.배정번호,
      배정제목: 몸.배정제목,
      내용: { 뼈대: 몸.뼈대, 원고: 결과 },
    });
    res.status(200).json(결과);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export default 가드(handler);
