// 정적 웹앱과 준비 자료 JSON API를 제공하는 서버
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeekOptions, localToday } from './web-options.mjs';
import { prepareLifeAndMinistry, prepareWatchtower } from './prep-service.mjs';
import { 환경만들기, 배정목록, 뼈대준비, 원고준비 } from './talk-service.mjs';

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

async function 본문읽기(req) {
  const 조각 = [];
  for await (const 덩이 of req) 조각.push(덩이);
  return JSON.parse(Buffer.concat(조각).toString('utf8') || '{}');
}

// 환경만들기 가 성경 인덱스를 새로 읽는 데 요청당 약 150ms 걸린다(실측).
// 이 서버는 프로세스가 오래 떠 있고 root 가 바뀌지 않으므로 한 번만 만들어 재사용한다.
let 캐시된환경 = null;
function 환경가져오기() {
  return 캐시된환경 ??= 환경만들기(root);
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
    if (url.pathname === '/api/talk-assignments') {
      json(res, 200, await 배정목록({
        날짜: url.searchParams.get('date'),
        프로필: JSON.parse(url.searchParams.get('profile') ?? 'null') ?? undefined,
      }));
      return;
    }
    if (url.pathname === '/api/talk-outline' && req.method === 'POST') {
      json(res, 200, await 뼈대준비(await 본문읽기(req), 환경가져오기()));
      return;
    }
    if (url.pathname === '/api/talk-draft' && req.method === 'POST') {
      json(res, 200, await 원고준비(await 본문읽기(req), 환경가져오기()));
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
