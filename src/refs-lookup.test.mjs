// 상호 참조의 정방향·역방향 색인이 올바른지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex, toVerseId, formatAddress } from './verse-address.mjs';
import { loadRefs } from './refs-lookup.mjs';

const skip = !existsSync('core/bible/refs/40-마태복음.tsv');
const idx = skip ? null : loadIndex();
const refs = skip ? null : loadRefs(idx);

test('정방향 참조는 TSV 에 적힌 그대로다', { skip }, () => {
  const id = toVerseId(idx, 40, 24, 14);
  const entries = refs.forward.get(id);
  assert.equal(entries.length, 7);
  assert.deepEqual(entries.map(e => e.label), [
    '마태복음 9:35', '마태복음 28:19-20', '마가복음 13:10', '고린도 전서 9:16',
    '골로새서 1:23', '베드로 전서 1:12', '요한 계시록 14:6',
  ]);
});

test('정방향 참조 총계는 65578 건이다', { skip }, () => {
  let n = 0;
  for (const entries of refs.forward.values()) n += entries.length;
  assert.equal(n, 65578);
});

test('역방향 색인은 범위 참조를 펼쳐서 담는다', { skip }, () => {
  const source = toVerseId(idx, 40, 24, 14);
  // 마태복음 24:14 는 마태복음 28:19-20 을 가리키므로 19절과 20절 양쪽에서 되짚어야 한다
  for (const verse of [19, 20]) {
    const target = toVerseId(idx, 40, 28, verse);
    assert.ok(
      refs.reverse.get(target).includes(source),
      `마태복음 28:${verse} 의 역방향에 마태복음 24:14 가 없다`
    );
  }
});

test('역방향 항목은 모두 실재하는 정방향 항목에서 나온다', { skip }, () => {
  for (const [target, sources] of refs.reverse) {
    for (const source of sources) {
      const entries = refs.forward.get(source);
      assert.ok(entries, `${formatAddress(idx, source)} 에 정방향 항목이 없다`);
      assert.ok(
        entries.some(e => target >= e.fromId && target <= e.toId),
        `${formatAddress(idx, source)} 가 ${formatAddress(idx, target)} 을 가리키지 않는다`
      );
    }
  }
});

test('역방향 목록에는 중복이 없고 오름차순으로 정렬돼 있다', { skip }, () => {
  for (const [target, sources] of refs.reverse) {
    assert.equal(
      new Set(sources).size, sources.length,
      `${formatAddress(idx, target)} 의 역방향에 중복이 있다`
    );
    for (let i = 1; i < sources.length; i++) {
      assert.ok(
        sources[i] > sources[i - 1],
        `${formatAddress(idx, target)} 의 역방향이 정렬돼 있지 않다`
      );
    }
  }
});

test('원본이 같은 참조를 두 번 적어도 역방향에는 한 번만 들어간다', { skip }, () => {
  // 창세기 14:2 의 참조 목록은 창세기 13:12 를 실제로 두 번 담고 있다
  const source = toVerseId(idx, 1, 14, 2);
  const target = toVerseId(idx, 1, 13, 12);
  const labels = refs.forward.get(source).map(e => e.label);
  assert.equal(
    labels.filter(l => l === '창세기 13:12').length, 2,
    '정방향은 원본 그대로 두 번이어야 한다'
  );
  assert.equal(
    refs.reverse.get(target).filter(s => s === source).length, 1,
    '역방향은 한 번이어야 한다'
  );
});

test('모든 참조의 절 ID 가 성경 범위 안에 있다', { skip }, () => {
  for (const entries of refs.forward.values()) {
    for (const e of entries) {
      assert.ok(e.fromId >= 0 && e.toId < idx.totals.verses, `범위 밖 참조: ${e.label}`);
      assert.ok(e.fromId <= e.toId, `거꾸로 된 참조: ${e.label}`);
    }
  }
});
