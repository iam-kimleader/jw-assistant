// ISO 주 계산과 주간 집회 페이지에서 파수대 docId 를 고르는 일을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isoWeek, weekStart, weekPageUrl, articleUrl, parseWeekPage } from './wol-week.mjs';

test('ISO 주를 계산한다', () => {
  assert.deepEqual(isoWeek(new Date('2026-07-30T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-07-27T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-08-02T00:00:00Z')), { year: 2026, week: 31 });
  assert.deepEqual(isoWeek(new Date('2026-08-03T00:00:00Z')), { year: 2026, week: 32 });
});

test('연말 연초 경계에서도 맞는다', () => {
  // 2026-01-01 은 목요일이므로 2026년 1주다
  assert.deepEqual(isoWeek(new Date('2026-01-01T00:00:00Z')), { year: 2026, week: 1 });
  // 2025-12-29 는 월요일이며 2026년 1주에 속한다
  assert.deepEqual(isoWeek(new Date('2025-12-29T00:00:00Z')), { year: 2026, week: 1 });
  // 2027-01-01 은 금요일이므로 2026년 53주에 속한다
  assert.deepEqual(isoWeek(new Date('2027-01-01T00:00:00Z')), { year: 2026, week: 53 });
});

test('그 주 월요일을 준다', () => {
  assert.equal(weekStart(new Date('2026-07-30T00:00:00Z')), '2026-07-27');
  assert.equal(weekStart(new Date('2026-07-27T00:00:00Z')), '2026-07-27');
  assert.equal(weekStart(new Date('2026-08-02T00:00:00Z')), '2026-07-27');
});

test('URL 을 만든다', () => {
  assert.equal(weekPageUrl(2026, 31), 'https://wol.jw.org/ko/wol/meetings/r8/lp-ko/2026/31');
  assert.equal(articleUrl('2026403'), 'https://wol.jw.org/ko/wol/d/r8/lp-ko/2026403');
});

test('주간 페이지에서 파수대 docId 를 고른다', () => {
  const html = `
    <li class="todayItem today html5 pub- docId-202026244 pub-mwb26 docClass-106">교재</li>
    <li class="todayItem publicationCitation html5 pub-w docId-2026403 pub-w26 docClass-40">파수대</li>
  `;
  assert.deepEqual(parseWeekPage(html), { 파수대docId: '2026403', 교재docId: '202026244' });
});

test('파수대 항목이 없으면 예외를 던진다', () => {
  const html = '<li class="todayItem pub- docId-202026244 pub-mwb26">교재만 있다</li>';
  assert.throws(() => parseWeekPage(html), /파수대/);
});
