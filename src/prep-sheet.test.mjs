// 예습지 마크다운이 코어 본문을 그대로 싣고 미해결을 숨기지 않는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { loadRefs } from './refs-lookup.mjs';
import { parseArticle } from './wol-article.mjs';
import { buildPrepSheet } from './prep-sheet.mjs';

const skip = !existsSync('core/bible/index.json') || !existsSync('core/bible/refs');
const html = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8');

function 만들기() {
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const 출처 = {
    기사URL: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/9999999',
    주페이지URL: 'https://wol.jw.org/ko/wol/meetings/r8/lp-ko/2026/31',
    조회날짜: '2026-07-30',
  };
  return buildPrepSheet(parseArticle(html), 도구, 출처);
}

test('머리말과 주제 성구를 싣는다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /2026년 7월 27일–8월 2일/);
  assert.match(마크다운, /더미 기사 제목/);
  assert.match(마크다운, /노래 56/);
});

test('성구 본문이 코어와 글자 단위로 같다', { skip }, () => {
  const index = loadIndex();
  const 본문 = createTextReader(index).verse(50, 3, 16);
  const { 마크다운 } = 만들기();
  assert.ok(본문, '빌립보서 3:16 본문이 코어에 있어야 한다');
  assert.ok(마크다운.includes(본문), '예습지가 코어 본문을 그대로 실어야 한다');
});

test('기사 문단 본문은 싣지 않는다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.doesNotMatch(마크다운, /더미 문단 본문이다/);
  assert.doesNotMatch(마크다운, /더미 둘째 문단이다/);
});

test('낭독 성구를 표시한다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /낭독/);
});

// 문단그룹 수는 9 이다. src/wol-article.test.mjs 의
// '문단그룹을 data-rel-pid 로 묶는다' 시험이 기사.문단그룹.length === 9 를
// 이미 검증한다 (질문 p46·p47·p48·p49·p50·p51·p52·p53·p54 아홉 개). 문단그룹마다
// '내 답' 칸이 하나씩 있어야 하므로 칸수도 9 이다.
test('내 답 칸을 문단그룹마다 둔다', { skip }, () => {
  const { 마크다운 } = 만들기();
  const 칸수 = (마크다운.match(/\*\*내 답\*\*/g) || []).length;
  assert.equal(칸수, 9);
});

test('출처에 URL 과 조회 날짜를 남긴다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /2026-07-30 조회/);
  assert.match(마크다운, /lp-ko\/9999999/);
  assert.match(마크다운, /meetings\/r8\/lp-ko\/2026\/31/);
});

// 인용수는 문단그룹별로 resolveAll 을 실측해 센 값이다 (src/_tmp-count.mjs 로 직접
// 실행해 확인했다. 임시 스크립트는 실행 후 지웠다).
// final-fix 단계에서 픽스처에 세 가지가 늘었다 — (1) 주제 성구 둘째 인용(Important 4),
// (2) 비연속·연속 쉼표 목록을 담은 그룹6, 인용 없는 비연속 문단번호 그룹7(Critical 1),
// (3) 절대 URL 인용 앵커를 담은 그룹8(Important 2). 그만큼 값을 실측으로 다시 잡았다.
//   주제성구 2 (빌립보 3:16, 3:17)
// + 그룹0(문단번호 [1,2], 질문 p46 1 + p7 2 + p8 1)                = 4
// + 그룹1(문단번호 [3], p9 2)                                       = 2
// + 그룹2(문단번호 [4,5], p10 3, p11 0)                             = 3
// + 그룹3(문단번호 [6], p12 1) — p12 는 data-rel-pid="[49, 50]" 으로
//   그룹3·그룹4 양쪽에 다 붙으므로 같은 인용(누가복음 21:34)이 두 번 세인다  = 1
// + 그룹4(문단번호 [6], p12 의 같은 인용이 다시)                     = 1
// + 그룹5(문단번호 [7], p13 1)                                       = 1
// + 그룹6(문단번호 [8], p14 3 — 베드로후서 3:7,13 / 잠언 3:5,6,9 / 마태 28:19,20) = 3
// + 그룹7(문단번호 [9,11], 인용 없음)                                = 0
// + 그룹8(문단번호 [12], p17 1 — 절대 URL 인용)                      = 1
// 합계 = 2+4+2+3+1+1+1+3+0+1 = 18
// 픽스처의 라벨이 전부 코어 색인에서 정상 해석되므로 해석수도 18, 미해결은 없다.
test('통계가 인용 수와 해석 수를 센다', { skip }, () => {
  const { 통계 } = 만들기();
  assert.equal(통계.인용수, 18);
  assert.equal(통계.해석수, 18);
  assert.deepEqual(통계.미해결, []);
});

// '계시록 2:4' → '없는책 2:4' 로 바꾸면 그 한 인용(그룹0 안 p8 의 인용)만 해석에
// 실패한다. 인용 라벨 개수 자체는 그대로이므로 인용수는 18 그대로이고,
// 해석수만 18 - 1 = 17 로 준다.
test('해석 실패는 본문에 표시하고 미해결에 모은다', { skip }, () => {
  const 깨진 = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8')
    .replace('>계시록 2:4<', '>없는책 2:4<');
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const 출처 = { 기사URL: 'u', 주페이지URL: 'v', 조회날짜: '2026-07-30' };
  const { 마크다운, 통계 } = buildPrepSheet(parseArticle(깨진), 도구, 출처);
  assert.equal(통계.인용수, 18);
  assert.equal(통계.해석수, 17);
  assert.equal(통계.미해결.length, 1);
  assert.equal(통계.미해결[0].라벨, '없는책 2:4');
  assert.match(마크다운, /⚠/);
  assert.match(마크다운, /## 미해결/);
});

// Critical 1 — 비연속 쉼표 목록(베드로 후서 3:7, 13 / 잠언 3:5, 6, 9)이 실재하지
// 않는 범위(3:7-13 / 3:5-9)로 찍히면 안 된다. 연속 목록(마태복음 28:19, 20)은
// 여전히 범위로 접혀야 한다 — 회귀 방지.
test('비연속 쉼표 목록은 범위로 접지 않고 나열한다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /\*\*베드로 후서 3:7, 13\*\*/);
  assert.doesNotMatch(마크다운, /베드로 후서 3:7-13/);
  assert.match(마크다운, /\*\*잠언 3:5, 6, 9\*\*/);
  assert.doesNotMatch(마크다운, /잠언 3:5-9/);
});

test('연속 쉼표 목록은 여전히 범위로 접는다 — 회귀 방지', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /\*\*마태복음 28:19-20\*\*/);
});

// Critical 1 — 문단번호가 [9, 11]처럼 비연속이면 머리말이 "9-11문단"으로 찍혀
// 사이 10문단까지 이 그룹에 속한 것처럼 오해를 낳으면 안 된다.
test('비연속 문단 번호는 범위로 접지 않고 나열한다', { skip }, () => {
  const { 마크다운 } = 만들기();
  assert.match(마크다운, /### 9, 11문단/);
  assert.doesNotMatch(마크다운, /### 9-11문단/);
});

// Important 4 — 주제 성구 둘째 인용(빌립보서 3:17)이 조용히 사라지지 않고
// 코어 본문 그대로 실려야 한다.
test('주제 성구가 둘이면 둘째도 해석해 싣는다', { skip }, () => {
  const index = loadIndex();
  const 본문17 = createTextReader(index).verse(50, 3, 17);
  const { 마크다운 } = 만들기();
  assert.ok(본문17, '빌립보서 3:17 본문이 코어에 있어야 한다');
  assert.ok(마크다운.includes(본문17), '주제 성구 둘째 인용의 본문도 실어야 한다');
});

// Important 3 — data-rel-pid 가 존재하지 않는 pid(예: 삽화·상자·복습 문단)를
// 가리키면 그 문단의 인용이 통째로 버려진다. 문서 전체 인용 앵커 수(문서인용수)는
// 물리적으로 그대로이므로, 통계.인용수 가 문서인용수보다 작아지는 것으로 결산이
// 이 유실을 잡아낼 수 있어야 한다. p10 의 data-rel-pid 를 존재하지 않는 pid 로
// 바꿔 p10 의 인용 3건(25-1·25-2·25-3)이 통째로 버려지게 만든다.
test('rel-pid 가 끊긴 문단의 인용은 결산에서 유실로 드러난다', { skip }, () => {
  const 끊긴 = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8')
    .replace('data-rel-pid="[48]"', 'data-rel-pid="[9999]"');
  const index = loadIndex();
  const 도구 = { index, text: createTextReader(index), refs: loadRefs(index) };
  const 출처 = { 기사URL: 'u', 주페이지URL: 'v', 조회날짜: '2026-07-30' };
  const 기사 = parseArticle(끊긴);
  const { 통계 } = buildPrepSheet(기사, 도구, 출처);
  assert.equal(기사.문서인용수, 17, '앵커는 물리적으로 그대로이므로 문서인용수는 안 바뀐다');
  assert.equal(통계.인용수, 15, 'p10 의 인용 3건이 어느 그룹에도 못 들어가 통계에서 빠진다');
  assert.ok(통계.인용수 < 기사.문서인용수, '결산 불일치 — 인용이 조용히 유실됐다는 신호다');
});
