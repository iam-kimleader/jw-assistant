// 파수대 기사 HTML 에서 예습에 필요한 구조가 정확히 뽑히는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseArticle } from './wol-article.mjs';

const html = readFileSync('tests/fixtures/파수대-기사-합성.html', 'utf8');
const 기사 = parseArticle(html);

test('머리말 항목을 뽑는다', () => {
  assert.equal(기사.주라벨, '2026년 7월 27일–8월 2일');
  assert.equal(기사.제목, '더미 기사 제목');
  assert.equal(기사.노래, '노래 56 더미 노래 제목');
  assert.equal(기사.요점, '더미 요점 문장이다.');
});

test('주제 성구를 인용문과 라벨로 나눠 뽑는다', () => {
  assert.equal(기사.주제성구.라벨, '빌립보 3:16');
  assert.equal(기사.주제성구.bid, '1-1');
  assert.match(기사.주제성구.인용문, /더미 주제 성구 인용문/);
});

// Important 4 — themeScrp 문단에 성구 링크가 둘 이상이면 첫째만 잡고 나머지를 조용히
// 버리는 결함이 있었다. 픽스처의 p4 에 두 번째 인용(bid 1-2, 라벨 "3:17" — 앞 인용의
// 권 "빌립보서"를 이어받는다)을 추가해 전체 목록이 보존되는지 확인한다.
test('주제 성구가 여럿이면 전체를 인용목록에 담는다', () => {
  assert.equal(기사.주제성구.인용목록.length, 2);
  assert.deepEqual(기사.주제성구.인용목록.map(c => c.bid), ['1-1', '1-2']);
  assert.equal(기사.주제성구.인용목록[1].라벨, '3:17');
});

test('문단그룹을 data-rel-pid 로 묶는다', () => {
  // 픽스처의 질문은 p46·p47·p48·p49·p50·p51·p52·p53·p54 아홉 개다.
  // p49·p50 은 문단 하나(p12)를 공유한다.
  assert.equal(기사.문단그룹.length, 9);
  assert.deepEqual(기사.문단그룹.map(g => g.문단번호),
    [[1, 2], [3], [4, 5], [6], [6], [7], [8], [9, 11], [12]]);
});

// Critical 1 의 근거 — 문단번호가 [9, 11]처럼 비연속이면 prep-sheet.mjs 가 머리말을
// "9-11문단" 으로 잘못 접지 않고 그대로 나열해야 한다. 그 전 단계로, 파서가 비연속
// 문단 번호를 있는 그대로 뽑아내는지부터 확인한다.
test('비연속 문단 번호도 있는 그대로 뽑는다', () => {
  assert.deepEqual(기사.문단그룹[7].문단번호, [9, 11]);
});

// Critical 1 의 근거 — 비연속 쉼표 목록(베드로 후서 3:7, 13 / 잠언 3:5, 6, 9)과
// 연속 목록(마태복음 28:19, 20)을 같은 문단에 담아, 파서가 라벨을 그대로 보존하는지
// 확인한다. 범위로 접거나 펴는 것은 prep-sheet.mjs 의 일이다.
test('비연속·연속 쉼표 목록 라벨을 그대로 뽑는다', () => {
  assert.deepEqual(기사.문단그룹[6].인용.map(c => c.라벨),
    ['베드로 후서 3:7, 13', '잠언 3:5, 6, 9', '마태복음 28:19, 20']);
});

// Important 2 — href 가 "/ko/wol/bc/" 로 시작하지 않고 절대 URL
// ("https://wol.jw.org/ko/wol/bc/...")로 오면 인용 앵커가 통째로 탈락하는 결함이 있었다.
test('절대 URL href 를 가진 인용 앵커도 잡는다', () => {
  assert.deepEqual(기사.문단그룹[8].인용.map(c => c.bid), ['30-1']);
  assert.equal(기사.문단그룹[8].인용[0].라벨, '디모데 후서 3:16');
});

// Important 3 — 문서 전체에서 인용 앵커인가를 만족하는 <a> 개수를 결산용으로 돌려준다.
// 이 픽스처의 실제 앵커 수를 세어 못 박은 값이다(문단그룹별 인용 배열의 길이를 모두
// 더하되 p12 는 그룹 두 곳에 걸려도 물리적으로 앵커 하나이므로 한 번만, 주제성구의
// 앵커 둘을 더한다 — 2+1+2+1+2+3+1+1+3+0+1 = 17).
test('문서 전체 인용 앵커 수를 센다', () => {
  assert.equal(기사.문서인용수, 17);
});

test('data-rel-pid 가 여러 그룹을 가리키면 문단이 두 그룹 모두에 들어간다', () => {
  const [여섯째, 일곱째] = [기사.문단그룹[3], 기사.문단그룹[4]];
  assert.deepEqual(여섯째.문단번호, [6]);
  assert.deepEqual(일곱째.문단번호, [6]);
  assert.deepEqual(여섯째.인용.map(c => c.bid), ['26-1']);
  assert.deepEqual(일곱째.인용.map(c => c.bid), ['26-1']);
});

test('속성 순서가 뒤바뀐 인용 앵커도 인용으로 잡는다', () => {
  const 여덟째 = 기사.문단그룹[5];
  assert.deepEqual(여덟째.인용.map(c => c.bid), ['27-1']);
  assert.equal(여덟째.인용[0].라벨, '데살로니가 전서 5:6');
});

test('속성 순서가 뒤바뀐 parNum span 도 문단 번호로 잡는다', () => {
  assert.deepEqual(기사.문단그룹[5].문단번호, [7]);
});

test('질문 본문에서 태그를 걷어낸다', () => {
  assert.match(기사.문단그룹[0].질문, /^1-2\./);
  assert.match(기사.문단그룹[0].질문, /더미 질문 첫 부분입니까/);
  assert.doesNotMatch(기사.문단그룹[0].질문, /</);
});

test('질문 안의 인용도 그 그룹에 담는다', () => {
  const 라벨들 = 기사.문단그룹[0].인용.map(c => c.라벨);
  assert.deepEqual(라벨들, ['빌립보서 3:16', '야고보 4:8ㄱ', '빌립보서 3:16', '계시록 2:4']);
});

test('낭독 표시를 잡아낸다', () => {
  const 낭독들 = 기사.문단그룹[0].인용.filter(c => c.낭독).map(c => c.bid);
  assert.deepEqual(낭독들, ['3-1']);
});

test('bid 를 문서 순서대로 보존한다', () => {
  assert.deepEqual(기사.문단그룹[2].인용.map(c => c.bid), ['25-1', '25-2', '25-3']);
});

test('인용이 없는 문단도 그룹에 포함된다', () => {
  assert.deepEqual(기사.문단그룹[2].문단번호, [4, 5]);
});

test('구조가 없는 HTML 은 예외를 던진다', () => {
  assert.throws(() => parseArticle('<html><body>아무것도 없다</body></html>'), /기사 구조/);
});

test('답 입력 칸 앞의 문단을 회중 성서 연구 질문으로 뽑는다', () => {
  const 대화형기사 = `
    <div class="bodyTxt">
      <p class="contextTtl" id="p1" data-pid="1"><strong>2</strong> 노아</p>
      <h1 id="p2" data-pid="2"><strong>세상을 정죄하다</strong></h1>
      <p id="p3" data-pid="3">에녹 시대의 세상은 매우 악했습니다.</p>
      <p id="p4" data-pid="4">노아는 여호와의 말씀을 믿고 방주를 만들기 시작했습니다.</p>
      <p id="p5" data-pid="5">노아와 그의 가족이 그 일을 하는 데는 용기가 필요했습니다.</p>
      <h3 id="p16" data-pid="16"><strong>토의해 보십시오</strong></h3>
      <p id="p17" data-pid="17"><strong>노아는 어떻게 용기를 나타냈습니까?</strong> (<a href="/ko/wol/pc/r8/lp-ko/1102025902/0/0">「파02」 3/1 5면 3항–6면 4항</a>)</p>
      <div class="gen-field"><textarea></textarea></div>
      <p id="p29" data-pid="29">우리 시대는 노아의 날과 어떻게 비슷합니까? (<a href="/ko/wol/bc/r8/lp-ko/1/0/0" data-bid="1-1" class="b">마태 24:36-39</a>)</p>
      <div class="gen-field"><textarea></textarea></div>
      <p id="p31" data-pid="31">당신은 노아의 본을 통해 다음과 같이 하는 것의 중요성에 대해 무엇을 배웠습니까?</p>
      <p id="p32" data-pid="32">잘 계획하고 조직하는 것 <strong>삽화 다</strong></p>
      <div class="gen-field"><textarea></textarea></div>
      <figure><img src="/ko/wol/mp/r8/lp-ko/wcg/2025/41" alt="일정이 적힌 다이어리와 달력이 보입니다."></figure>
      <h2 id="p40" data-pid="40"><strong>시야를 넓혀 생각해 보기</strong></h2>
      <p id="p41" data-pid="41">이 성경 기록을 통해 여호와에 대해 무엇을 배울 수 있을까?</p>
      <div class="gen-field"><textarea></textarea></div>
    </div>
  `;
  const result = parseArticle(대화형기사);
  assert.equal(result.주라벨, '2 노아');
  assert.equal(result.문단그룹.length, 4);
  assert.equal(result.문단그룹[0].질문, '노아는 어떻게 용기를 나타냈습니까? (「파02」 3/1 5면 3항–6면 4항)');
  assert.deepEqual(result.문단그룹[0].참고출판물, [{
    표시: '「파02」 3/1 5면 3항–6면 4항',
    url: 'https://wol.jw.org/ko/wol/pc/r8/lp-ko/1102025902/0/0',
  }]);
  assert.equal(result.문단그룹[0].문단본문[0], '노아와 그의 가족이 그 일을 하는 데는 용기가 필요했습니다.');
  assert.equal(result.문단그룹[1].인용[0].라벨, '마태 24:36-39');
  assert.equal(result.문단그룹[0].소제목, '토의해 보십시오');
  assert.equal(result.문단그룹[2].상위질문, '당신은 노아의 본을 통해 다음과 같이 하는 것의 중요성에 대해 무엇을 배웠습니까?');
  assert.equal(result.문단그룹[2].삽화[0].url, 'https://wol.jw.org/ko/wol/mp/r8/lp-ko/wcg/2025/41');
  assert.equal(result.문단그룹[2].삽화[0].alt, '일정이 적힌 다이어리와 달력이 보입니다.');
  assert.equal(result.문단그룹[3].소제목, '시야를 넓혀 생각해 보기');
});
