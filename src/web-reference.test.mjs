// 답변 카드의 참고 출판물 링크와 답변 전용 복사 동작을 검증하는 테스트
// 주의: 아직 문자열 대조다. Task 9 에서 컴포넌트 시험으로 바꾼다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const card = readFileSync('web/src/components/AnswerCard.tsx', 'utf8');

test('답변 카드가 참고 출판물 목록을 그린다', () => {
  assert.match(card, /function 참고출판물목록/);
  assert.match(card, /<참고출판물목록 목록=\{답변\.참고출판물 \?\? \[\]\}/);
  assert.match(card, /참고 출판물/);
});

test('참고 출판물은 새 창에서 열리는 안전한 링크로 렌더링한다', () => {
  assert.match(card, /target="_blank"/);
  assert.match(card, /rel="noopener noreferrer"/);
  assert.match(card, /참고\.표시 \|\| 참고\.제목/);
});

test('참고 출판물 주소는 url 이 없으면 원문URL 로 넘어간다', () => {
  assert.match(card, /참고\.url \|\| 참고\.원문URL/);
});

test('클립보드에는 답변 본문만 전달한다', () => {
  assert.match(card, /export function 복사할글\(답변: 답변형\) \{\s*return 답변\.답변;\s*\}/);
  assert.match(card, /클립보드에쓰기\(복사할글\(답변\)\)/);
});
