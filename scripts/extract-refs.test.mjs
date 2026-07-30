// 상호 참조 추출 결과가 올바른 형식과 내용을 갖는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const REFS_DIR = 'core/bible/refs';
const FILE = `${REFS_DIR}/40-마태복음.tsv`;
const skip = !existsSync(FILE);
const lines = skip ? [] : readFileSync(FILE, 'utf8').split('\n').filter(Boolean);

test('66개 파일 모든 줄이 장:절 과 참조 목록으로 이루어진다', { skip }, () => {
  const files = readdirSync(REFS_DIR).filter(f => f.endsWith('.tsv'));
  for (const file of files) {
    const bookLines = readFileSync(`${REFS_DIR}/${file}`, 'utf8').split('\n').filter(Boolean);
    for (const line of bookLines) {
      assert.match(line, /^\d+:\d+\t.+$/, `${file} 형식이 틀린 줄: ${line}`);
    }
  }
});

test('마태복음 24:14 의 참조가 7건이다', { skip }, () => {
  const line = lines.find(l => l.startsWith('24:14\t'));
  assert.ok(line, '24:14 줄이 없다');
  const refs = line.split('\t')[1].split(', ');
  assert.equal(refs.length, 7);
  // 참조는 단일 절(`책 1:1`)이거나 범위(`책 1:1-2`, 장이 걸치면 `책 1:1-2:1`)일 수 있다
  assert.ok(refs.every(r => /^.+ \d+:\d+(-\d+(:\d+)?)?$/.test(r)), `주소 형식이 아닌 참조가 있다: ${refs}`);
});

// 장을 넘어가는 범위 참조가 끝 절의 장 번호를 잃어버리지 않는지 값으로 고정한다.
// (브리프 원안은 같은 장만 가정해 "열왕기상 6:37-1" 처럼 장이 빠진 채로 나왔었다 — 실제 회귀 사례)
test('에스라 4:8 은 장을 넘어가는 범위 참조를 정확한 장:절로 표기한다', { skip }, () => {
  const ezraLines = readFileSync(`${REFS_DIR}/15-에스라.tsv`, 'utf8').split('\n').filter(Boolean);
  const line = ezraLines.find(l => l.startsWith('4:8\t'));
  assert.equal(line, '4:8\t에스라 4:8-6:18');
});

test('전체 참조 줄 수가 0보다 많다', { skip }, () => {
  assert.ok(lines.length > 0);
});
