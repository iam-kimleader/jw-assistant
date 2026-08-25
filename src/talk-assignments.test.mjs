// 그 주 교재에서 연설 배정을 뽑는 파서를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTalkAssignments } from './talk-assignments.mjs';
import { parseMinistryMeeting } from './ministry-meeting.mjs';

const html = readFileSync('tests/fixtures/교재-배정.html', 'utf8');
const 배정 = parseTalkAssignments(html);
const 번호로 = n => 배정.find(x => x.번호 === n);
const 교재원본 = html;

test('세 절의 항목을 번호 순서대로 모두 뽑는다', () => {
  assert.deepEqual(배정.map(x => x.번호), [1, 2, 3, 4, 6, 7, 9]);
  assert.equal(번호로(1).절, '보물');
  assert.equal(번호로(4).절, '야외봉사');
  assert.equal(번호로(7).절, '생활');
});

test('영적 보물 찾기와 회중 성서 연구는 연설이 아니다', () => {
  assert.equal(번호로(2).종류, '연설아님');
  assert.equal(번호로(9).종류, '연설아님');
});

test('시간을 초로 바꾼다', () => {
  assert.equal(번호로(1).시간초, 600);
  assert.equal(번호로(3).시간초, 240);
  assert.equal(번호로(4).시간초, 240);
  assert.equal(번호로(6).시간초, 300);
});

test('1번 보물 연설의 소제목 셋과 묵상을 뽑는다', () => {
  const 하나 = 번호로(1);

  assert.equal(하나.종류, '보물연설');
  assert.equal(하나.소제목.length, 3);
  assert.equal(하나.소제목[0].문장, '회개하는 유대인들은 마음을 다해 여호와를 찾을 것이었습니다');
  assert.ok(하나.묵상.startsWith('여호와께서 우리를 징계하실 때'));
});

test('삽화 설명을 소제목으로 세지 않는다', () => {
  assert.ok(!번호로(1).소제목.some(x => x.문장.includes('세 명의 장로')));
});

test('쪼개진 성구 앵커를 두 주소로 나눠 담는다', () => {
  const 셋째 = 번호로(1).소제목[2];

  assert.deepEqual(셋째.성구, ['렘 30:11', '히 12:6']);
  assert.deepEqual(셋째.출판물, [{ 표시: '「예레」 168면 2항', pc: '/ko/wol/pc/r8/lp-ko/202026248/2/0' }]);
});

test('소제목 문장에서 괄호 안 참조를 떼어 낸다', () => {
  const 첫째 = 번호로(1).소제목[0];

  assert.ok(!첫째.문장.includes('렘 29:12'));
  assert.ok(!첫째.문장.includes('「예레」'));
  assert.deepEqual(첫째.성구, ['렘 29:12, 13']);
});

test('성경 낭독의 범위와 지정 요점을 뽑는다', () => {
  const 셋 = 번호로(3);

  assert.equal(셋.종류, '성경낭독');
  assert.equal(셋.낭독범위, '렘 30:1-11');
  assert.deepEqual(셋.지정요점, { 책: '읽가', 과: 2, 요점: null });
});

test('시연의 봉사 형태와 요점 번호까지 뽑는다', () => {
  const 넷 = 번호로(4);

  assert.equal(넷.종류, '시연');
  assert.equal(넷.봉사형태, '호별 방문');
  assert.deepEqual(넷.지정요점, { 책: '랑제', 과: 3, 요점: 4 });
});

test('학생 연설을 시연과 구분한다', () => {
  const 여섯 = 번호로(6);

  assert.equal(여섯.종류, '학생연설');
  assert.equal(여섯.봉사형태, '');
  assert.deepEqual(여섯.지정요점, { 책: '읽가', 과: 1, 요점: null });
});

test('그리스도인 생활 항목은 생활부분이고 본문을 교재원문에 담는다', () => {
  const 일곱 = 번호로(7);

  assert.equal(일곱.종류, '생활부분');
  assert.ok(일곱.교재원문.includes('바빌론에 포로로'));
});

test('기존 parseMinistryMeeting 의 반환값이 그대로다', () => {
  // 설계 문서 14절이 요구하는 회귀 방지다. 파수대 예습과 생활과 봉사 답변 생성이
  // 이 함수를 이미 쓰고 있으므로 모양이 바뀌면 두 기능이 조용히 깨진다.
  const 결과 = parseMinistryMeeting(교재원본);

  assert.deepEqual(Object.keys(결과).sort(), ['성경범위', '영적보물질문', '주라벨', '회중성서연구']);
  assert.ok(Array.isArray(결과.영적보물질문));
  assert.equal(결과.회중성서연구.서책명, '용하');
  assert.equal(결과.회중성서연구.장, 5);
});
