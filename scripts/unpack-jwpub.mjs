// jwpub 원본에서 SQLite DB 를 꺼내 .cache 에 놓는 스크립트
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readEntries, extractEntry } from '../src/zip.mjs';

const JWPUB = process.argv[2] ?? join(homedir(), 'Downloads', 'nwtsty_KO.jwpub');
const CACHE = '.cache';
const DB_OUT = join(CACHE, 'nwtsty_KO.db');

if (!existsSync(JWPUB)) {
  console.error(`원본을 찾을 수 없다: ${JWPUB}`);
  process.exit(1);
}
mkdirSync(CACHE, { recursive: true });

const outer = readEntries(JWPUB);
const manifest = JSON.parse(
  extractEntry(JWPUB, outer.find(e => e.name === 'manifest.json')).toString('utf8')
);
const dbName = manifest.publication.fileName;
console.log(`출판물: ${manifest.publication.title} (${manifest.publication.year})`);

const contentsZip = join(CACHE, 'contents.zip');
writeFileSync(contentsZip, extractEntry(JWPUB, outer.find(e => e.name === 'contents')));

const inner = readEntries(contentsZip);
const dbEntry = inner.find(e => e.name === dbName);
if (!dbEntry) throw new Error(`contents 안에서 ${dbName} 을 찾을 수 없다`);

writeFileSync(DB_OUT, extractEntry(contentsZip, dbEntry));
console.log(`생성: ${DB_OUT}`);
