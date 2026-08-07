// WOL 참고 출판물의 메타데이터와 지정된 항 본문 추출을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  enrichAnswersWithPublicationReferences,
  parsePublicationDocument,
  selectPublicationContent,
  stripPublicationContents,
} from './publication-reference.mjs';
import referenceMap from './wol-reference-map.json' with { type: 'json' };

const html = `
  <article id="article" class="article document docId-2012284 pub-w">
    <h1 id="p1">여호와께서는 자신의 백성을 구출하실 줄 아십니다</h1>
    <p id="p6">번호가 없는 머리말 문장입니다.</p>
    <p id="p11"><span class="parNum" data-pnum="4"></span>시간적인 요소가 중요했습니다.</p>
    <p id="p12"><span class="parNum" data-pnum="5"></span>120년은 하느님의 판결이었습니다.</p>
    <p id="p13"><span class="parNum" data-pnum="6"></span>방주 명령은 수십 년 뒤에 주어졌습니다.</p>
    <p id="p14"><span class="parNum" data-pnum="7"></span>정확한 시점은 비가 오기 7일 전에 알려 주셨습니다.</p>
    <p id="p15"><span class="parNum" data-pnum="8"></span>여호와께서는 정하신 때에 구출하십니다.</p>
    <p id="p16"><span class="parNum" data-pnum="9"></span>홍해에 관한 다음 내용입니다.</p>
    <div class="boxSupplement"><aside>
      <p id="p25">대홍수 전승에는 여러 공통점이 있습니다.</p>
    </aside></div>
    <input type="hidden" id="contentTitle" value="여호와께서는 자신의 백성을 구출하실 줄 아십니다"/>
    <input type="hidden" id="parentTitle" value="파수대—여호와의 왕국 선포 2012"/>
  </article>
`;

test('현재 회중 성서 연구의 참고 링크 5개가 정확한 WOL 범위로 미리 해석되어 있다', () => {
  const entries = Object.entries(referenceMap).filter(([url]) => url.includes('/1102025902/'));
  assert.equal(entries.length, 5);
  assert.ok(entries.every(([, url]) => /\/wol\/d\/.+#h=\d+:\d+-\d+:\d+$/.test(url)));
});

test('현재 21주 범위의 매니페스트가 공식 WOL 참고 링크만 담는다', () => {
  const entries = Object.entries(referenceMap);
  assert.ok(entries.length >= 5);
  assert.ok(entries.every(([source, target]) =>
    /^https:\/\/wol\.jw\.org\/ko\/wol\/pc\//.test(source)
    && /^https:\/\/wol\.jw\.org\/ko\/wol\/d\/.+#h=\d+:\d+-\d+:\d+$/.test(target)));
});

test('참고 출판물 제목과 실제 문서 URL을 뽑는다', () => {
  const document = parsePublicationDocument(html);
  assert.equal(document.제목, '여호와께서는 자신의 백성을 구출하실 줄 아십니다');
  assert.equal(document.출판물, '파수대—여호와의 왕국 선포 2012');
  assert.equal(document.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284');
});

test('표시 문구의 항 범위에 해당하는 본문만 고른다', () => {
  const selected = selectPublicationContent(
    parsePublicationDocument(html),
    '「파12」 4/15 23면 5-8항',
    '노아가 방주를 지으라는 명령을 받은 때는 언제였습니까?',
  );
  assert.match(selected.본문, /120년은 하느님의 판결/);
  assert.match(selected.본문, /정확한 시점은 비가 오기 7일 전/);
  assert.doesNotMatch(selected.본문, /홍해에 관한/);
  assert.doesNotMatch(selected.본문, /번호가 없는 머리말/);
  assert.equal(selected.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#p12');
});

test('WOL 리디렉션의 정확한 문단 범위를 가장 먼저 사용한다', () => {
  const selected = selectPublicationContent(
    parsePublicationDocument(html),
    '「파12」 4/15 23면 5-8항',
    '노아가 방주를 지으라는 명령을 받은 때는 언제였습니까?',
    'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#h=12:0-16:0',
  );
  assert.match(selected.본문, /120년은 하느님의 판결/);
  assert.match(selected.본문, /여호와께서는 정하신 때에 구출/);
  assert.doesNotMatch(selected.본문, /시간적인 요소가 중요/);
  assert.equal(selected.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#h=12:0-16:0');
});

test('네모 참고 자료는 보충 상자 본문을 고른다', () => {
  const selected = selectPublicationContent(parsePublicationDocument(html), '네모', '대홍수가 실제로 일어났습니까?');
  assert.equal(selected.본문, '대홍수 전승에는 여러 공통점이 있습니다.');
  assert.equal(selected.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#p25');
});

test('항 번호 span이 없는 옛 파수대는 문서 pid로 항 위치를 추정한다', () => {
  const oldArticle = parsePublicationDocument(`
    <article class="article document docId-2002161 pub-w">
      <p id="p1" data-pid="1">기사 제목</p>
      <p id="p2" data-pid="2">도입 문단</p>
      <p id="p3" data-pid="3">소제목</p>
      <p id="p4" data-pid="4">홍수 전 문명에는 여러 유리한 점이 있었습니다.</p>
      <p id="p5" data-pid="5">당시 사람들은 여러 세기 동안 살았습니다.</p>
      <p id="p6" data-pid="6">다음 문단</p>
    </article>
  `);
  const selected = selectPublicationContent(oldArticle, '「파02」 3/1 5면 3항–6면 4항', '홍수 전 세상은 어땠습니까?');
  assert.match(selected.본문, /여러 유리한 점/);
  assert.match(selected.본문, /여러 세기 동안/);
  assert.doesNotMatch(selected.본문, /다음 문단/);
  assert.equal(selected.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2002161#p4');
});

test('사전형 출판물의 1번 항목 안에서는 첫 항을 기준으로 번호를 추정한다', () => {
  const insight = parsePublicationDocument(`
    <article class="article document docId-1200003266 pub-it-1">
      <h1 id="p1" data-pid="1">노아</h1>
      <p id="p2" data-pid="2">(Noah)</p>
      <p id="p3" data-pid="3"><strong>1.</strong> 노아에 관한 첫째 항목입니다.</p>
      <p id="p14" data-pid="14"><strong>니므롯의 반역</strong> 노아는 바벨탑 사건을 보았습니다.</p>
    </article>
  `);
  const selected = selectPublicationContent(insight, '「통」 “노아” 1번 12항', '대홍수 뒤 무슨 일이 있었습니까?');
  assert.equal(selected.본문, '니므롯의 반역 노아는 바벨탑 사건을 보았습니다.');
  assert.equal(selected.url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1200003266#p14');
});

test('질문별 원문을 보강한 뒤 공개 응답에서는 본문만 제거한다', async () => {
  const answers = [{
    id: 'q-1',
    질문: '노아가 방주를 지으라는 명령을 받은 때는 언제였습니까?',
    참고출판물: [{ 표시: '「파12」 4/15 23면 5-8항', url: 'https://wol.jw.org/ko/wol/pc/r8/lp-ko/1102025902/1/0' }],
  }];
  const enriched = await enrichAnswersWithPublicationReferences(answers, {
    accessedAt: '2026-08-08',
    fetchDocument: async () => ({
      html,
      resolvedUrl: 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#h=12:0-16:0',
    }),
  });

  assert.match(enriched[0].참고출판물[0].본문, /방주 명령은 수십 년 뒤/);
  assert.equal(enriched[0].참고출판물[0].조회일, '2026-08-08');
  assert.equal(enriched[0].참고출판물[0].url, 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2012284#h=12:0-16:0');
  const stripped = stripPublicationContents(enriched);
  assert.equal('본문' in stripped[0].참고출판물[0], false);
  assert.equal(stripped[0].참고출판물[0].표시, '「파12」 4/15 23면 5-8항');
});

test('별도 참고 자료가 없는 질문에도 공식 출판물 원문 링크를 제공한다', () => {
  const sourceUrl = 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1102025902';
  const [stripped] = stripPublicationContents([{
    id: 'q-1',
    질문: '우리 시대는 노아의 날과 어떻게 비슷합니까?',
    출처URL: sourceUrl,
    참고출판물: [],
  }]);

  assert.deepEqual(stripped.참고출판물, [{
    표시: '이 질문이 실린 공식 출판물',
    url: sourceUrl,
    원문URL: sourceUrl,
  }]);
});
