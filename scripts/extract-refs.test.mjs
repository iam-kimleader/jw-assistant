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
  assert.equal(files.length, 66, `파일이 66개가 아니다 — 실제 ${files.length}`);
  for (const file of files) {
    const bookLines = readFileSync(`${REFS_DIR}/${file}`, 'utf8').split('\n').filter(Boolean);
    for (const line of bookLines) {
      assert.match(line, /^\d+:\d+\t.+$/, `${file} 형식이 틀린 줄: ${line}`);
    }
  }
});

test('전체 66개 파일의 참조 총량이 65578건이다', { skip }, () => {
  const files = readdirSync(REFS_DIR).filter(f => f.endsWith('.tsv'));
  let total = 0;
  for (const file of files) {
    const bookLines = readFileSync(`${REFS_DIR}/${file}`, 'utf8').split('\n').filter(Boolean);
    for (const line of bookLines) {
      total += line.split('\t')[1].split(', ').length;
    }
  }
  assert.equal(total, 65578);
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

// 장 경계를 넘는 범위 참조는 전체 65578건 중 정확히 4건이며, 나머지 세 건도 같은 방식으로 값에 고정한다.
test('열왕기상 9:10 은 장을 넘어가는 범위 참조를 정확한 장:절로 표기한다', { skip }, () => {
  const kingsLines = readFileSync(`${REFS_DIR}/11-열왕기상.tsv`, 'utf8').split('\n').filter(Boolean);
  const line = kingsLines.find(l => l.startsWith('9:10\t'));
  assert.equal(line, '9:10\t열왕기상 6:37-7:1, 역대기하 8:1-2');
});

test('역대기상 13:5 는 장을 넘어가는 범위 참조를 정확한 장:절로 표기한다', { skip }, () => {
  const chroniclesLines = readFileSync(`${REFS_DIR}/13-역대기상.tsv`, 'utf8').split('\n').filter(Boolean);
  const line = chroniclesLines.find(l => l.startsWith('13:5\t'));
  assert.equal(line, '13:5\t민수기 34:2, 민수기 34:8, 사무엘상 6:21-7:1, 사무엘하 6:1-2, 역대기상 15:3');
});

test('다니엘 2:4 는 장을 넘어가는 범위 참조를 정확한 장:절로 표기한다', { skip }, () => {
  const danielLines = readFileSync(`${REFS_DIR}/27-다니엘.tsv`, 'utf8').split('\n').filter(Boolean);
  const line = danielLines.find(l => l.startsWith('2:4\t'));
  assert.equal(line, '2:4\t열왕기하 18:26, 에스라 4:7, 이사야 36:11, 다니엘 2:4-7:28');
});

test('전체 참조 줄 수가 0보다 많다', { skip }, () => {
  assert.ok(lines.length > 0);
});
