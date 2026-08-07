// 주간 성경 읽기 범위의 로컬 본문 구성과 폴백 선택을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { buildWeeklyReadingEvidence, buildWeeklyReadingFallback, findWeeklyReadingVerse } from './weekly-reading.mjs';

const skip = !existsSync('core/bible/index.json') || !existsSync('core/bible/text');

function tools() {
  const index = loadIndex();
  return { index, text: createTextReader(index) };
}

test('예레미야 22-23장을 로컬 성경의 70절로 펼친다', { skip }, () => {
  const reader = tools();
  const reading = buildWeeklyReadingEvidence('예레미야 22-23장', reader);

  assert.equal(reading.범위, '예레미야 22-23장');
  assert.equal(reading.책, '예레미야');
  assert.equal(reading.본문.length, 70);
  assert.equal(reading.본문[0].주소, '예레미야 22:1');
  assert.equal(reading.본문.at(-1).주소, '예레미야 23:40');
  assert.equal(reading.본문[0].본문, reader.text.verse(24, 22, 1));
  assert.equal(reading.본문.at(-1).본문, reader.text.verse(24, 23, 40));
});

test('한 장으로 된 주간 범위도 펼친다', { skip }, () => {
  const reading = buildWeeklyReadingEvidence('예레미야 22장', tools());
  assert.equal(reading.본문.length, 30);
  assert.equal(reading.본문.at(-1).주소, '예레미야 22:30');
});

test('시편의 편 표기도 주간 범위로 펼친다', { skip }, () => {
  const reading = buildWeeklyReadingEvidence('시편 120-121편', tools());
  assert.equal(reading.본문[0].주소, '시편 120:0');
  assert.equal(reading.본문.at(-1).주소, '시편 121:8');
});

test('폴백 답변도 주간 범위 안의 특정 성구를 사용한다', { skip }, () => {
  const reading = buildWeeklyReadingEvidence('예레미야 22-23장', tools());
  const fallback = buildWeeklyReadingFallback(reading);
  const selected = fallback.성구[0].본문[0];

  assert.equal(selected.주소, '예레미야 22:3');
  assert.equal(reading.본문.some(verse => verse.주소 === selected.주소 && verse.본문 === selected.본문), true);
  assert.match(fallback.답변, new RegExp(selected.주소));
  assert.match(fallback.성구[0].라벨, /예레미야 22-23장/);
});

test('선택 성구의 범위 표기는 허용하고 다른 책이나 불완전한 주소는 거부한다', { skip }, () => {
  const reading = buildWeeklyReadingEvidence('예레미야 22-23장', tools());
  assert.equal(findWeeklyReadingVerse(reading, '예레미야 22:3-4').주소, '예레미야 22:3');
  assert.equal(findWeeklyReadingVerse(reading, '예레미야 22:3, 4').주소, '예레미야 22:3');
  assert.equal(findWeeklyReadingVerse(reading, '예레미야 22:30').주소, '예레미야 22:30');
  assert.equal(findWeeklyReadingVerse(reading, '창세기 22:3'), null);
  assert.equal(findWeeklyReadingVerse(reading, '22:3'), null);
});

test('잘못된 주간 범위는 조용히 다른 본문을 사용하지 않는다', { skip }, () => {
  assert.throws(() => buildWeeklyReadingEvidence('예레미야 이야기', tools()), /범위를 해석할 수 없다/);
  assert.throws(() => buildWeeklyReadingEvidence('예레미야 23-22장', tools()), /거꾸로 됐다/);
  assert.throws(() => buildWeeklyReadingEvidence('예레미야 99장', tools()), /장을 찾을 수 없다/);
});
