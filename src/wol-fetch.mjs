// WOL 문서를 캐시하며 받아오는 모듈
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const 캐시디렉토리 = process.env.VERCEL ? join(tmpdir(), 'jw-assistant-wol') : '.cache/wol';

export async function fetchCached(url, cacheName, cacheDir = 캐시디렉토리) {
  const 경로 = join(cacheDir, cacheName);
  if (existsSync(경로)) return readFileSync(경로, 'utf8');
  const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) throw new Error(`${url} 를 받지 못했다 — HTTP ${r.status}`);
  const html = await r.text();
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(경로, html, 'utf8');
  } catch {
    // Vercel 같은 서버리스 환경에서는 캐시 쓰기가 실패해도 응답 자체는 사용할 수 있어야 한다.
  }
  return html;
}
