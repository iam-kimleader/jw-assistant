// 교본 과 파서와 매니페스트 로더를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTeachingLesson, 찾기 } from './teaching-lessons.mjs';

const 읽가1 = readFileSync('tests/fixtures/읽가-1과.html', 'utf8');
const 랑제3 = readFileSync('tests/fixtures/랑제-3과.html', 'utf8');

test('「읽가」 과에서 책과 번호와 제목과 요점을 뽑는다', () => {
  const 결과 = parseTeachingLesson(읽가1);

  assert.equal(결과.책, '읽가');
  assert.equal(결과.과, 1);
  assert.equal(결과.제목, '효과적인 서론');
  assert.equal(
    결과.요점,
    '서론에서 듣는 사람의 흥미를 불러일으키고, 말할 내용이 무엇인지 밝히고, 듣는 사람이 왜 관심을 가져야 하는지 알려 주어야 합니다.',
  );
});

test('요점에서 「이 과의 요점:」 라벨을 떼어 낸다', () => {
  const 결과 = parseTeachingLesson(읽가1);

  assert.ok(!결과.요점.startsWith('이 과의 요점'));
  assert.ok(!결과.요점.startsWith(':'));
});

test('「랑제」 과에서 원칙을 뽑고 요점은 비운다', () => {
  const 결과 = parseTeachingLesson(랑제3);

  assert.equal(결과.책, '랑제');
  assert.equal(결과.과, 3);
  assert.equal(결과.제목, '친절');
  assert.equal(결과.원칙, '“사랑은 ··· 친절합니다.”—고린도 전서 13:4.');
  assert.equal(결과.요점, '');
});

test('제목에서 「N과」 접두를 떼어 낸다', () => {
  assert.equal(parseTeachingLesson(랑제3).제목, '친절');
  assert.equal(parseTeachingLesson(읽가1).제목, '효과적인 서론');
});

test('매니페스트에서 책과 과로 찾는다', () => {
  const 매니페스트 = {
    읽가: { 제목: '읽고 가르치는 기술을 발전시키십시오', 과: [{ 번호: 2, 제목: '자연스럽게 말하기', 요점: '가', docid: 1102018442 }] },
    랑제: { 제목: '사람들을 사랑하고 제자로 삼으십시오', 과: [] },
  };

  assert.deepEqual(찾기(매니페스트, '읽가', 2), { 번호: 2, 제목: '자연스럽게 말하기', 요점: '가', docid: 1102018442 });
  assert.equal(찾기(매니페스트, '읽가', 99), null);
  assert.equal(찾기(매니페스트, '없는책', 2), null);
});
