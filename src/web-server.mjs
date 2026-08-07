// 정적 웹앱과 준비 자료 JSON API를 제공하는 서버
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeekOptions, localToday } from './web-options.mjs';
import { prepareLifeAndMinistry, prepareWatchtower } from './prep-service.mjs';

const root = normalize(join(fileURLToPath(new URL('..', import.meta.url))));
const webRoot = join(root, 'web');
const ogImage = join(root, 'asset', 'og-image-jw-assistant.png');
const port = Number(process.env.PORT || 3000);

const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
]);

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function staticFile(res, pathname) {
  const clean = pathname === '/' ? '/index.html' : pathname;
  const target = pathname === '/og-image-jw-assistant.png' ? ogImage : normalize(join(webRoot, clean));
  const 공개파일 = target === ogImage || target.startsWith(`${webRoot}${sep}`);
  if (!공개파일 || !existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('찾을 수 없습니다.');
    return;
  }
  const headers = { 'Content-Type': types.get(extname(target)) ?? 'application/octet-stream' };
  if (target === ogImage) headers['Cache-Control'] = 'public, max-age=86400';
  res.writeHead(200, headers);
  res.end(readFileSync(target));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/options') {
      json(res, 200, { today: localToday().toISOString().slice(0, 10), weeks: buildWeekOptions() });
      return;
    }
    if (url.pathname === '/api/watchtower') {
      json(res, 200, await prepareWatchtower(url.searchParams.get('date'), root));
      return;
    }
    if (url.pathname === '/api/life-ministry') {
      json(res, 200, await prepareLifeAndMinistry(url.searchParams.get('date'), root));
      return;
    }
    staticFile(res, url.pathname);
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}

createServer((req, res) => {
  handle(req, res);
}).listen(port, () => {
  console.log(`jw-assistant 웹앱이 열렸습니다. http://localhost:${port}`);
});
