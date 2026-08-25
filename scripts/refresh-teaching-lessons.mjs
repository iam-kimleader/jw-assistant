// 「읽가」·「랑제」 전 과를 훑어 교본 매니페스트를 만들고 기준선을 감시하는 스크립트
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCached } from '../src/wol-fetch.mjs';
import { parseTeachingLesson, 책이름 } from '../src/teaching-lessons.mjs';

const 루트 = join(fileURLToPath(new URL('..', import.meta.url)));
const 산출경로 = join(루트, 'src', 'teaching-lessons.json');
const 기준선 = { 읽가: 20, 랑제: 12 };
const 시작 = { 읽가: 1102018441, 랑제: 1102023301 };
const 최대 = 60;

function 오늘() {
  return new Date().toISOString().slice(0, 10);
}

async function 책수집(책) {
  const 과들 = [];
  for (let i = 0; i < 최대; i++) {
    const docid = 시작[책] + i;
    let 결과;
    try {
      const html = await fetchCached(`https://wol.jw.org/ko/wol/d/r8/lp-ko/${docid}`, `교본-${docid}.html`);
      결과 = parseTeachingLesson(html);
    } catch (e) {
      console.log(`  ${docid} 조회 실패 — ${e.message}`);
      break;
    }
    if (결과.책 !== 책 || !결과.과) break;
    과들.push({ 번호: 결과.과, 제목: 결과.제목, 요점: 결과.요점, 원칙: 결과.원칙, docid });
    console.log(`  ${책} ${결과.과}과 ${결과.제목}`);
  }
  return 과들;
}

const 매니페스트 = {};
for (const 책 of ['읽가', '랑제']) {
  console.log(`${책} 수집 중.`);
  매니페스트[책] = { 제목: 책이름[책], 조회일: 오늘(), 과: await 책수집(책) };
}

let 미달 = false;
for (const [책, 최소] of Object.entries(기준선)) {
  const 수 = 매니페스트[책].과.length;
  console.log(`${책} ${수}과 (기준선 ${최소})`);
  if (수 < 최소) {
    console.error(`  ${책}가 기준선보다 적다. 파서나 docid 범위를 확인하라.`);
    미달 = true;
  }
}

// 기준선 검사를 통과했을 때만 쓴다. 먼저 쓰면 망 오류로 일부만 받아도 잘린 파일이
// 저장소의 정상 매니페스트를 덮어쓴 뒤에야 exit 1 이 나서, 파서가 조용히 얇아지는
// 것을 막는다는 원칙이 무색해진다.
if (미달) {
  console.error('기준선에 못 미쳐 매니페스트를 쓰지 않았다. 기존 파일을 그대로 둔다.');
} else {
  writeFileSync(산출경로, `${JSON.stringify(매니페스트, null, 2)}\n`, 'utf8');
  console.log(`${산출경로} 에 썼다.`);
}

process.exit(미달 ? 1 : 0);
