// 수집된 성경 본문이 인덱스 기준선과 일치하는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { loadIndex } from '../src/verse-address.mjs';
import { verifyBible } from './verify-bible.mjs';

const skip = !existsSync('core/bible/text/01-창세기.md');

test('본문이 인덱스 기준선과 완전히 일치한다', { skip }, () => {
  const result = verifyBible(loadIndex());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

// .cache/nwtsty_KO.db 가 있다는 것은 이 기기에서 산출물을 직접 생성할 수 있다는 뜻이다.
// 그런 기기에서는 위 테스트의 skip 가드가 생성 실패를 초록불로 가리지 않도록,
// 색인과 66개 본문 파일이 실제로 존재하는지 직접 단언한다.
test('DB 캐시가 있으면 색인과 본문 66개 파일이 모두 존재한다', { skip: !existsSync('.cache/nwtsty_KO.db') }, () => {
  assert.ok(existsSync('core/bible/index.json'), 'core/bible/index.json 이 없다');
  const index = loadIndex();
  for (const book of index.books) {
    const file = `core/bible/text/${book.slug}.md`;
    assert.ok(existsSync(file), `${file} 이 없다`);
  }
});

test('잔류 HTML 태그와 엔티티(대문자 16진수 포함)를 문제로 보고한다', () => {
  const file = 'core/bible/text/__verify-bible-test-fixture.md';
  writeFileSync(
    file,
    ['1:1\t태그가 <b>남은</b> 절이다.', '1:2\t대문자 16진수 엔티티&#XA0;가 남은 절이다.'].join('\n') + '\n',
    'utf8'
  );
  try {
    const fakeIndex = { books: [{ title: '테스트책', slug: '__verify-bible-test-fixture', chapters: [{ num: 1, verses: 2 }] }] };
    const result = verifyBible(fakeIndex);
    assert.equal(result.ok, false);
    assert.ok(result.problems.some(p => p.includes('태그')), 'HTML 태그 문제가 보고되지 않았다');
    assert.ok(result.problems.some(p => p.includes('엔티티')), '잔류 엔티티 문제가 보고되지 않았다');
  } finally {
    unlinkSync(file);
  }
});
