// ZIP 리더가 실제 jwpub 파일을 올바로 읽는지 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readEntries, extractEntry } from './zip.mjs';

const JWPUB = join(homedir(), 'Downloads', 'nwtsty_KO.jwpub');

test('jwpub 최상위에는 manifest.json 과 contents 두 항목이 있다', { skip: !existsSync(JWPUB) }, () => {
  const entries = readEntries(JWPUB);
  const names = entries.map(e => e.name).sort();
  assert.deepEqual(names, ['contents', 'manifest.json']);
});

test('manifest.json 을 꺼내면 nwtsty 한국어 연구용 성경이다', { skip: !existsSync(JWPUB) }, () => {
  const entries = readEntries(JWPUB);
  const manifest = JSON.parse(
    extractEntry(JWPUB, entries.find(e => e.name === 'manifest.json')).toString('utf8')
  );
  assert.equal(manifest.publication.uniqueEnglishSymbol, 'nwtsty');
  assert.equal(manifest.publication.language, 129);
  assert.equal(manifest.publication.fileName, 'nwtsty_KO.db');
});
