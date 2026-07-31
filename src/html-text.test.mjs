// HTML 조각을 사람이 읽는 문자열로 바꾸는 일이 정확한지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText } from './html-text.mjs';

test('태그를 걷어낸다', () => {
  assert.equal(htmlToText('<p>가나<strong>다라</strong></p>'), '가나다라');
});

test('이름 있는 엔티티를 디코딩한다', () => {
  assert.equal(htmlToText('가&nbsp;나'), '가 나');
  assert.equal(htmlToText('&lt;&gt;&quot;'), '<>"');
  assert.equal(htmlToText('가&mdash;나'), '가—나');
  assert.equal(htmlToText('&copy;'), '©');
});

test('숫자 엔티티를 10진수와 16진수 모두 디코딩한다', () => {
  assert.equal(htmlToText('&#44032;'), '가');
  assert.equal(htmlToText('&#xAC00;'), '가');
});

test('&amp; 를 마지막에 풀어 이중 디코딩을 막는다', () => {
  assert.equal(htmlToText('&amp;lt;'), '&lt;');
});

test('연속 공백을 하나로 줄이고 양끝을 다듬는다', () => {
  assert.equal(htmlToText('  가\n\n  나  '), '가 나');
});

test('빈 입력에도 안전하다', () => {
  assert.equal(htmlToText(''), '');
  assert.equal(htmlToText('<span></span>'), '');
});
