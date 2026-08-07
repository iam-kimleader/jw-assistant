// 생활과 봉사 교재 파싱 규칙을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPublicationChapter, parseMinistryMeeting } from './ministry-meeting.mjs';

const html = `
  <h1>8월 3-9일</h1>
  <h2>예레미야 22-23장</h2>
  <h2><strong>성경에 담긴 보물</strong></h2>
  <h3><strong>2. 영적 보물 찾기</strong></h3>
  <p>(10분)</p>
  <p><a href="/ko/wol/bc/r8/lp-ko/1/0/0" data-bid="1-1" class="b">렘 23:33</a> — 질문입니까?</p>
  <p>이번 주 성경 읽기를 통해 어떤 영적 보물을 발견했습니까?</p>
  <h3><strong>3. 성경 낭독</strong></h3>
  <h2><strong>그리스도인 생활</strong></h2>
  <h3><strong>8. 회중 성서 연구</strong></h3>
  <p>(30분) <a href="/ko/wol/pc/r8/lp-ko/202026245/10/0">「용하」 2장</a></p>
`;

test('영적 보물 찾기와 회중 성서 연구 정보를 뽑는다', () => {
  const result = parseMinistryMeeting(html);
  assert.equal(result.주라벨, '8월 3-9일');
  assert.equal(result.성경범위, '예레미야 22-23장');
  assert.equal(result.영적보물질문.length, 2);
  assert.equal(result.영적보물질문[0].인용[0].라벨, '렘 23:33');
  assert.equal(result.회중성서연구.서책명, '용하');
  assert.equal(result.회중성서연구.장, 2);
  assert.equal(result.회중성서연구.심벌, 'wcg');
});

test('출판물 색인에서 장으로 표시된 링크를 찾는다', () => {
  const index = '<a href="/ko/wol/d/r8/lp-ko/1102017162">2장 하느님께서 그들의 예물을 기뻐하셨다</a>';
  assert.equal(findPublicationChapter(index, 2), 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1102017162');
});

test('출판물 색인에서 장 번호와 인물로 표시된 링크를 찾는다', () => {
  const index = '<a href="/ko/wol/d/r8/lp-ko/1102025902"><span>2 노아</span><span>세상을 정죄하다</span></a>';
  assert.equal(findPublicationChapter(index, 2), 'https://wol.jw.org/ko/wol/d/r8/lp-ko/1102025902');
});
