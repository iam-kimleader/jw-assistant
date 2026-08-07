// wol 성구 라벨 해석이 실제 기사에 나온 형태를 전부 감당하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex, toVerseId } from './verse-address.mjs';
import { resolveBook, parseCitation, resolveAll } from './citation-parse.mjs';

const skip = !existsSync('core/bible/index.json');
const idx = skip ? null : loadIndex();

// 주소들을 "권-장:절" 문자열로 줄여 비교를 읽기 쉽게 한다
const 요약 = r => r.주소들.map(a => `${a.book}-${a.chapter}:${a.verse}`);

test('완전 일치하는 권 이름을 해석한다', { skip }, () => {
  assert.deepEqual(resolveBook(idx, '여호수아'), { 성공: true, book: 6, title: '여호수아' });
  assert.deepEqual(resolveBook(idx, '고린도 전서'), { 성공: true, book: 46, title: '고린도 전서' });
  // 공백을 빼도 같게 본다
  assert.deepEqual(resolveBook(idx, '고린도전서'), { 성공: true, book: 46, title: '고린도 전서' });
});

test('별칭표에 있는 권 이름을 해석한다', { skip }, () => {
  assert.equal(resolveBook(idx, '계시록').book, 66);
  assert.equal(resolveBook(idx, '요한').book, 43);
  assert.equal(resolveBook(idx, '렘').book, 24);
  assert.equal(resolveBook(idx, '벧전').book, 60);
});

test('접두가 유일하면 그 권으로 해석한다', { skip }, () => {
  assert.equal(resolveBook(idx, '빌립보').book, 50);
  assert.equal(resolveBook(idx, '야고보').book, 59);
  assert.equal(resolveBook(idx, '히브리').book, 58);
  assert.equal(resolveBook(idx, '시').book, 19);
  assert.equal(resolveBook(idx, '전도').book, 21);
  assert.equal(resolveBook(idx, '에베소').book, 49);
  assert.equal(resolveBook(idx, '골로새').book, 51);
  assert.equal(resolveBook(idx, '마태').book, 40);
  assert.equal(resolveBook(idx, '신명').book, 5);
});

test('없는 권은 실패로 준다', { skip }, () => {
  const r = resolveBook(idx, '없는책');
  assert.equal(r.성공, false);
  assert.match(r.사유, /권을 찾을 수 없다/);
});

test('단일 절 라벨을 해석한다', { skip }, () => {
  const r = parseCitation(idx, '빌립보서 3:16');
  assert.equal(r.성공, true);
  assert.deepEqual(요약(r), ['50-3:16']);
  assert.equal(r.주소들[0].verseId, toVerseId(idx, 50, 3, 16));
});

test('같은 권의 짧은 표기와 긴 표기가 같은 절을 준다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '빌립보 3:16')), 요약(parseCitation(idx, '빌립보서 3:16')));
});

test('ㄱ·ㄴ 접미사를 떼고 해석한다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '야고보 4:8ㄱ')), ['59-4:8']);
  assert.deepEqual(요약(parseCitation(idx, '야고보 4:8ㄴ')), ['59-4:8']);
});

test('쉼표 목록을 낱개 주소로 펼친다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '마태 28:19, 20')), ['40-28:19', '40-28:20']);
  assert.deepEqual(요약(parseCitation(idx, '잠언 5:1, 2')), ['20-5:1', '20-5:2']);
  assert.deepEqual(요약(parseCitation(idx, '시 101:6, 7')), ['19-101:6', '19-101:7']);
});

test('붙임표 범위를 낱개 주소로 펼친다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '고린도 전서 3:18-20')), ['46-3:18', '46-3:19', '46-3:20']);
  assert.deepEqual(요약(parseCitation(idx, '디모데 후서 2:16-18')), ['55-2:16', '55-2:17', '55-2:18']);
  assert.deepEqual(요약(parseCitation(idx, '에베소 6:11-13')), ['49-6:11', '49-6:12', '49-6:13']);
});

test('후행 세미콜론을 무시한다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '여호수아 1:8;')), ['6-1:8']);
  assert.deepEqual(요약(parseCitation(idx, '시 133:1;')), ['19-133:1']);
});

test('권 이름이 없으면 직전 권을 이어받는다', { skip }, () => {
  assert.deepEqual(요약(parseCitation(idx, '119:63', 19)), ['19-119:63']);
  assert.deepEqual(요약(parseCitation(idx, '10:31', 46)), ['46-10:31']);
});

test('권과 장이 없으면 같은 bid 그룹의 직전 권과 장을 이어받는다', { skip }, () => {
  const out = resolveAll(idx, [
    { 라벨: '창세 3:4-6,', bid: '1-1', 낭독: false },
    { 라벨: '14, 15', bid: '1-2', 낭독: false },
  ]);
  assert.equal(out[0].해석.성공, true);
  assert.equal(out[1].해석.성공, true);
  assert.deepEqual(요약(out[1].해석), ['1-3:14', '1-3:15']);
});

test('권 이름이 없는데 직전 권도 없으면 실패로 준다', { skip }, () => {
  const r = parseCitation(idx, '119:63', null);
  assert.equal(r.성공, false);
  assert.match(r.사유, /앞선 권이 없다/);
});

test('후보가 여럿이면 조용히 고르지 않고 실패로 준다', { skip }, () => {
  const r = resolveBook(idx, '데살로니가');
  assert.equal(r.성공, false);
  assert.match(r.사유, /후보가 여럿이다/);
});

test('없는 절은 실패로 준다', { skip }, () => {
  const r = parseCitation(idx, '창세기 1:99');
  assert.equal(r.성공, false);
  assert.match(r.사유, /범위/);
});

test('예외를 던지지 않는다', { skip }, () => {
  assert.doesNotThrow(() => parseCitation(idx, '말도 안 되는 문자열'));
  assert.equal(parseCitation(idx, '말도 안 되는 문자열').성공, false);
});

test('bid 그룹 안에서만 권을 이어받는다', { skip }, () => {
  const 인용들 = [
    { 라벨: '시 101:6, 7;', bid: '23-1', 낭독: false },
    { 라벨: '119:63', bid: '23-2', 낭독: false },
    { 라벨: '10:31', bid: '24-1', 낭독: false },   // 그룹이 바뀌었으므로 이어받지 못한다
  ];
  const out = resolveAll(idx, 인용들);
  assert.equal(out[0].해석.성공, true);
  assert.deepEqual(요약(out[1].해석), ['19-119:63']);
  assert.equal(out[2].해석.성공, false);
  assert.match(out[2].해석.사유, /앞선 권이 없다/);
});

test('실제 기사의 bid 그룹을 그대로 재현한다', { skip }, () => {
  const 인용들 = [
    { 라벨: '에베소 6:11-13;', bid: '25-1', 낭독: false },
    { 라벨: '고린도 전서 9:26, 27;', bid: '25-2', 낭독: false },
    { 라벨: '10:31', bid: '25-3', 낭독: false },
  ];
  const out = resolveAll(idx, 인용들);
  assert.deepEqual(요약(out[2].해석), ['46-10:31']);   // 고린도 전서를 이어받는다
});

test('2026년 7월 27일 주간 기사의 라벨 34종이 전부 해석된다', { skip }, () => {
  const 라벨들 = [
    '빌립보 3:16', '빌립보서 3:16', '야고보 4:8ㄱ', '계시록 2:4', '고린도 전서 15:58',
    '마태 22:37', '여호수아 1:8;', '마태 28:19, 20;', '히브리 10:25', '마태 6:24',
    '골로새 2:8', '잠언 5:1, 2', '베드로 전서 5:8', '고린도 전서 3:18-20',
    '디모데 후서 2:16-18', '디모데 전서 4:15', '에베소서 5:15, 16', '시 133:1;',
    '잠언 18:1', '마태 6:33', '전도 4:6;', '디모데 전서 4:8', '잠언 21:5',
    '잠언 11:14', '고린도 전서 15:33', '잠언 13:20', '시 101:6, 7;', '시 1:1',
    '에베소 6:11-13;', '고린도 전서 9:26, 27;', '고린도 후서 13:5', '잠언 3:5, 6',
  ];
  const 실패 = 라벨들.filter(l => !parseCitation(idx, l).성공);
  assert.deepEqual(실패, [], `해석하지 못한 라벨이 있다: ${실패.join(' / ')}`);
});
