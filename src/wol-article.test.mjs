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

test('문단그룹을 data-rel-pid 로 묶는다', () => {
  // 픽스처의 질문은 p46·p47·p48·p49·p50·p51 여섯 개다. p49·p50 은 문단 하나(p12)를 공유한다
  assert.equal(기사.문단그룹.length, 6);
  assert.deepEqual(기사.문단그룹.map(g => g.문단번호), [[1, 2], [3], [4, 5], [6], [6], [7]]);
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
