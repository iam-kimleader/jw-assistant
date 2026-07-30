// wol 장 페이지 파서가 절을 정확히 뽑아내는지 픽스처로 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { chapterUrl, parseChapter } from './wol-chapter.mjs';
import { splitLines } from './text-lines.mjs';

const FIX = 'tests/fixtures/wol-40-24.html';
const SNAPSHOT = 'tests/fixtures/wol-40-24.snapshot.tsv';
const skip = !existsSync(FIX) || !existsSync(SNAPSHOT);
const html = skip ? '' : readFileSync(FIX, 'utf8');

test('장 URL 을 만든다', () => {
  assert.equal(chapterUrl(40, 24), 'https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/40/24');
  assert.equal(chapterUrl(1, 1), 'https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/1/1');
});

test('마태복음 24장에서 51개 절을 뽑는다', { skip }, () => {
  const verses = parseChapter(html);
  assert.equal(verses.length, 51);
  assert.equal(verses[0].verse, 1);
  assert.equal(verses[50].verse, 51);
  assert.ok(verses.every(v => v.book === 40 && v.chapter === 24));
});

test('절 번호가 1부터 빠짐없이 이어진다', { skip }, () => {
  const verses = parseChapter(html);
  verses.forEach((v, i) => assert.equal(v.verse, i + 1));
});

test('13절과 14절 본문이 정확하다', { skip }, () => {
  const verses = parseChapter(html);
  const v13 = verses.find(v => v.verse === 13);
  const v14 = verses.find(v => v.verse === 14);
  assert.equal(v13.text, '그러나 끝까지 인내하는 사람은 구원을 받을 것입니다.');
  assert.equal(
    v14.text,
    '그리고 이 왕국의 좋은 소식이 모든 민족에게 증거되기 위해 사람이 거주하는 온 땅에 전파될 것입니다. 그리고 끝이 올 것입니다.'
  );
});

test('본문에 태그와 참조 기호가 남아 있지 않다', { skip }, () => {
  for (const v of parseChapter(html)) {
    assert.ok(!v.text.includes('<'), `${v.verse}절에 태그가 남아 있다`);
    assert.ok(!/&(\w+|#\d+);/.test(v.text), `${v.verse}절에 엔티티가 남아 있다`);
    assert.ok(!v.text.includes('+'), `${v.verse}절에 상호참조 기호가 남아 있다`);
    assert.ok(!v.text.includes('*'), `${v.verse}절에 각주 기호가 남아 있다`);
    assert.ok(!/^\d/.test(v.text), `${v.verse}절이 숫자로 시작한다`);
    assert.ok(v.text.length > 0, `${v.verse}절이 비어 있다`);
  }
});

test('51개 절 전체가 저장된 스냅샷과 일치한다', { skip }, () => {
  const verses = parseChapter(html);
  const snapshot = splitLines(readFileSync(SNAPSHOT, 'utf8').trim());
  assert.equal(verses.length, snapshot.length);
  verses.forEach((v, i) => {
    assert.equal(`${v.chapter}:${v.verse}\t${v.text}`, snapshot[i]);
  });
});
