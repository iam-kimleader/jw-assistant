// 그 주 파수대 연구 기사를 받아 예습지를 만들어 activities 에 쓰는 조립 스크립트
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadIndex } from '../src/verse-address.mjs';
import { createTextReader } from '../src/bible-text.mjs';
import { loadRefs } from '../src/refs-lookup.mjs';
import { isoWeek, weekStart, weekPageUrl, articleUrl, parseWeekPage } from '../src/wol-week.mjs';
import { parseArticle } from '../src/wol-article.mjs';
import { buildPrepSheet } from '../src/prep-sheet.mjs';

const USAGE = [
  '사용법',
  '  npm run 집회준비                     오늘이 속한 주',
  '  npm run 집회준비 -- 2026-08-02       날짜로 다른 주를 지정',
  '  npm run 집회준비 -- --docid 2026403  기사를 직접 지정 (wol 구조가 바뀌었을 때)',
  '  npm run 집회준비 -- --덮어쓰기           이미 있는 예습지를 덮어쓴다',
].join('\n');

const 캐시디렉토리 = '.cache/wol';

async function 받기(url, 캐시이름) {
  const 경로 = join(캐시디렉토리, 캐시이름);
  if (existsSync(경로)) return readFileSync(경로, 'utf8');
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${url} 를 받지 못했다 — HTTP ${r.status}`);
  const html = await r.text();
  mkdirSync(캐시디렉토리, { recursive: true });
  writeFileSync(경로, html, 'utf8');
  return html;
}

const 인자 = process.argv.slice(2);
if (인자.includes('--help') || 인자.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}

let docid지정 = null;
if (인자.includes('--docid')) {
  const 값 = 인자[인자.indexOf('--docid') + 1];
  if (!값 || 값.startsWith('-')) {
    console.error(`--docid 뒤에 값이 없다.\n\n${USAGE}`);
    process.exit(1);
  }
  docid지정 = 값;
}

const 덮어쓰기 = 인자.includes('--덮어쓰기');
const 날짜인자 = 인자.find(a => /^\d{4}-\d{2}-\d{2}$/.test(a));

// 이 기기의 달력 날짜를 그대로 UTC 자정으로 옮긴다.
// new Date() 를 그대로 쓰면 한국 시간 오전 9시 이전에 UTC 로는 전날이 되어 주가 하나 밀린다.
function 오늘의날짜() {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}

const 기준일 = 날짜인자 ? new Date(`${날짜인자}T00:00:00Z`) : 오늘의날짜();
if (Number.isNaN(기준일.getTime())) {
  console.error(`날짜를 해석할 수 없다: ${날짜인자}\n\n${USAGE}`);
  process.exit(1);
}
// JS 의 Date 는 실재하지 않는 날짜(예 2026-02-31)를 거부하지 않고 다음 날로 굴려 버린다.
// 굴러갔으면 조용히 넘어가지 않고 무엇으로 해석됐는지 보여주며 멈춘다.
if (날짜인자 && 기준일.toISOString().slice(0, 10) !== 날짜인자) {
  console.error(`날짜가 실재하지 않아 다른 날짜로 굴러갔다 — 입력 ${날짜인자}, 해석 결과 ${기준일.toISOString().slice(0, 10)}\n\n${USAGE}`);
  process.exit(1);
}

function 읽거나종료(무엇, 읽기) {
  try {
    return 읽기();
  } catch (e) {
    console.error(`${무엇} 를 읽을 수 없다: ${e.message}`);
    console.error('README.md 의 파이프라인 순서대로 산출물을 먼저 만들어야 한다.');
    process.exit(1);
  }
}

const index = 읽거나종료('성경 색인', () => loadIndex());
const 도구 = {
  index,
  text: createTextReader(index),
  refs: 읽거나종료('상호 참조', () => loadRefs(index)),
};

const { year, week } = isoWeek(기준일);
const 주URL = weekPageUrl(year, week);

let docId = docid지정;
if (!docId) {
  try {
    const 주html = await 받기(주URL, `week-${year}-${week}.html`);
    docId = parseWeekPage(주html).파수대docId;
  } catch (e) {
    console.error(`주간 집회 페이지에서 기사를 찾지 못했다: ${e.message}`);
    console.error(`${주URL} 을 열어 docId 를 확인한 뒤 --docid 로 지정할 수 있다.`);
    process.exit(1);
  }
}

const 기사URL = articleUrl(docId);
let 기사;
try {
  기사 = parseArticle(await 받기(기사URL, `doc-${docId}.html`));
} catch (e) {
  console.error(`기사를 해석하지 못했다: ${e.message}`);
  console.error(`${기사URL} 의 구조가 바뀌었을 수 있다. 예습지를 쓰지 않고 멈춘다.`);
  process.exit(1);
}

const 조회날짜 = 오늘의날짜().toISOString().slice(0, 10);
const { 마크다운, 통계 } = buildPrepSheet(기사, 도구, { 기사URL, 주페이지URL: 주URL, 조회날짜 });

const 폴더 = join('activities', 'meetings', weekStart(기준일));
mkdirSync(폴더, { recursive: true });
const 산출물 = join(폴더, '파수대-예습.md');

// 이미 예습지가 있으면 그 안의 "내 답" 이 날아갈 수 있으므로, 명시적으로 --덮어쓰기 를
// 주지 않는 한 쓰지 않고 멈춘다.
if (existsSync(산출물) && !덮어쓰기) {
  console.error(`예습지가 이미 있다 — ${산출물}`);
  console.error('다시 만들려면 --덮어쓰기 를 붙여서 실행한다.');
  process.exit(1);
}

writeFileSync(산출물, 마크다운, 'utf8');

console.log(`\n${기사.주라벨}  ${기사.제목}`);
console.log(`예습지 → ${산출물}`);
console.log(`인용 ${통계.인용수}건 중 ${통계.해석수}건 해석, ${통계.미해결.length}건 미해결`);
for (const m of 통계.미해결) console.log(`  ⚠ ${m.라벨} — ${m.사유}`);
console.log();
if (통계.미해결.length) process.exitCode = 1;

// 결산 — 문단그룹으로 묶이며 인용이 조용히 버려질 수 있다(질문 문단에 data-pid 가
// 없거나, data-rel-pid 가 질문이 아닌 pid 를 가리키는 경우). 통계.인용수 는 한 문단이
// 여러 그룹에 걸리면 같은 인용을 두 번 세므로 기사.문서인용수 보다 커도 정상이다.
// 작아지는 것만 유실 신호다.
if (통계.인용수 === 0 || 통계.인용수 < 기사.문서인용수) {
  console.error(`⚠ 인용 결산이 맞지 않는다 — 문서의 인용 앵커는 ${기사.문서인용수}건인데 예습지에는 ${통계.인용수}건만 실렸다.`);
  console.error('기사 구조가 바뀌어 인용이 조용히 빠졌을 수 있다. 예습지는 이미 썼지만 반드시 확인해야 한다.');
  process.exitCode = 1;
}
