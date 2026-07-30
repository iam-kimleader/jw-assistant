// 상호 참조 산출물이 DB 재계산 값과 형식·범위·총량 기준을 만족하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { loadIndex } from '../src/verse-address.mjs';
import { verifyRefs } from './verify-refs.mjs';

const DB = '.cache/nwtsty_KO.db';
const skip = !existsSync(DB) || !existsSync('core/bible/refs/01-창세기.tsv');

test('참조가 DB 재계산 값과 완전히 일치하고 형식·범위·총량이 기준에 맞는다', { skip }, () => {
  const result = verifyRefs(loadIndex());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

// .cache/nwtsty_KO.db 가 있다는 것은 이 기기에서 산출물을 직접 생성할 수 있다는 뜻이다.
// 그런 기기에서는 위 테스트의 skip 가드가 생성 실패를 초록불로 가리지 않도록,
// 참조 파일 66개가 실제로 존재하는지 직접 단언한다.
test('DB 캐시가 있으면 참조 파일 66개가 모두 존재한다', { skip: !existsSync(DB) }, () => {
  const index = loadIndex();
  for (const book of index.books) {
    const file = `core/bible/refs/${book.slug}.tsv`;
    assert.ok(existsSync(file), `${file} 이 없다`);
  }
});
