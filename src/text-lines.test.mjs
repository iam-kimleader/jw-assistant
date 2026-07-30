// splitLines 가 LF 와 CRLF 를 모두 올바르게 줄 단위로 나누는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitLines } from './text-lines.mjs';

test('LF 로만 끝나는 내용은 그대로 줄을 나눈다', () => {
  assert.deepEqual(splitLines('1:1\t가\n1:2\t나\n'), ['1:1\t가', '1:2\t나', '']);
});

test('CRLF 로 끝나는 줄은 \\r 을 남기지 않고 나눈다', () => {
  assert.deepEqual(splitLines('1:1\t가\r\n1:2\t나\r\n'), ['1:1\t가', '1:2\t나', '']);
});
