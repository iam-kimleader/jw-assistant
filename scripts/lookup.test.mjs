// 성구 조회 도구를 실제로 실행해 출력과 종료 코드를 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const skip = !existsSync('core/bible/refs/40-마태복음.tsv');

function run(arg) {
  return execFileSync(process.execPath, ['--no-warnings', 'scripts/lookup.mjs', arg], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function runExpectingFailure(arg) {
  try {
    execFileSync(process.execPath, ['--no-warnings', 'scripts/lookup.mjs', arg], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return null;
  } catch (e) {
    return { status: e.status, stderr: String(e.stderr) };
  }
}

test('본문과 양방향 참조를 함께 보여준다', { skip }, () => {
  const out = run('마태복음 24:14');
  assert.match(out, /그리고 이 왕국의 좋은 소식이 모든 민족에게 증거되기 위해/);
  assert.match(out, /이 성구가 가리키는 참조 7개/);
  assert.match(out, /이 성구를 가리키는 참조 \d+개/);
  // 정방향 참조는 본문까지 펼친다
  assert.match(out, /또한 좋은 소식이 먼저 모든 민족에게 전파되어야 합니다\./);
});

test('200절짜리 범위 참조는 본문을 펼치지 않고 절 수만 알린다', { skip }, () => {
  const out = run('다니엘 2:4');
  assert.match(out, /다니엘 2:4-7:28\s+\(200절 —/);
  const lines = out.split('\n').length;
  assert.ok(lines < 60, `출력이 ${lines}줄이다. 큰 범위가 펼쳐졌을 수 있다`);
});

test('작은 범위 참조는 본문을 펼친다', { skip }, () => {
  const out = run('마태복음 24:14');
  assert.match(out, /▶ 마태복음 28:19-20/);
  assert.match(out, /28:19 {2}그러므로 가서 모든 민족의 사람들을 제자로 삼아/);
  assert.match(out, /28:20 {2}내가 여러분에게 명령한 모든 것을 지키도록 가르치십시오/);
});

test('시편 표제를 0절로 조회한다', { skip }, () => {
  const out = run('시편 3:0');
  assert.match(out, /시편 3:0/);
  assert.match(out, /다윗의 시가\. 아들 압살롬을 피해 도망할 때/);
});

test('범위를 주면 절마다 따로 보여준다', { skip }, () => {
  const out = run('시편 3:0-1');
  assert.match(out, /시편 3:0 – 3:1 {2}\(2절\)/);
  assert.match(out, /■ 시편 3:0/);
  assert.match(out, /■ 시편 3:1/);
});

test('본문에 없는 절과 형식 오류는 1 로 끝나고 안내를 준다', { skip }, () => {
  const gone = runExpectingFailure('요한복음 8:5');
  assert.equal(gone.status, 1);
  assert.match(gone.stderr, /범위를 벗어났다/);

  const malformed = runExpectingFailure('마태복음 24장');
  assert.equal(malformed.status, 1);
  assert.match(malformed.stderr, /해석할 수 없다/);
  assert.match(malformed.stderr, /사용법/);

  const reversed = runExpectingFailure('마태복음 24:16-14');
  assert.equal(reversed.status, 1);
  assert.match(reversed.stderr, /거꾸로/);
});

test('인자가 없으면 사용법을 보여주고 1 로 끝난다', { skip }, () => {
  const none = runExpectingFailure('');
  assert.equal(none.status, 1);
  assert.match(none.stderr, /사용법/);
});
