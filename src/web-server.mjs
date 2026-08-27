// 정적 웹앱과 준비 자료 JSON API를 제공하는 서버
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildWeekOptions, localToday } from './web-options.mjs';
import { prepareLifeAndMinistry, prepareWatchtower } from './prep-service.mjs';
import { 환경만들기, 배정목록, 뼈대준비, 원고준비 } from './talk-service.mjs';
import {
  인증가져오기, 설정읽기, 세션쿠키이름, 상태쿠키이름, 신원쿠키이름, 짧은쿠키수명초,
} from './auth-runtime.mjs';
import { 세션만들기, 세션읽기, 쿠키만들기, 쿠키지우기, 쿠키읽기 } from './session.mjs';

const root = normalize(join(fileURLToPath(new URL('..', import.meta.url))));
const webRoot = join(root, 'web', 'dist');
const ogImage = join(root, 'asset', 'og-image-jw-assistant.png');
const port = Number(process.env.PORT || 3000);
const 서른일 = 30 * 24 * 60 * 60;

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
  let target = pathname === '/og-image-jw-assistant.png' ? ogImage : normalize(join(webRoot, clean));
  const 공개파일 = target === ogImage || target.startsWith(`${webRoot}${sep}`);
  // 화면 경로는 파일이 아니다. React 라우터가 받도록 index.html 을 돌려준다.
  if (공개파일 && !existsSync(target) && !extname(target)) target = join(webRoot, 'index.html');
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

// api/auth-callback.js 와 같은 내용을 node:http 의 res 로 옮겨 적은 것이다.
async function 로그인완료처리(req, res, url) {
  const 설정 = 설정읽기();
  const 결과 = await 인증가져오기().로그인완료({
    code: url.searchParams.get('code'),
    state: url.searchParams.get('state'),
    저장된state: 쿠키읽기(req.headers.cookie, 상태쿠키이름),
  });

  const 지울상태 = 쿠키지우기(상태쿠키이름, 설정);

  if (결과.결과 === '승인') {
    const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
    res.writeHead(302, {
      Location: '/',
      'Set-Cookie': [지울상태, 쿠키만들기(세션쿠키이름, 세션, 서른일, 설정)],
    }).end();
    return;
  }

  if (결과.결과 === '초대필요') {
    // 초대 화면으로 넘길 신원만 짧게 들고 간다. 세션이 아니다.
    const 신원 = 세션만들기(결과.신원, 설정.세션비밀, Date.now(), 짧은쿠키수명초);
    res.writeHead(302, {
      Location: '/invite',
      'Set-Cookie': [지울상태, 쿠키만들기(신원쿠키이름, 신원, 짧은쿠키수명초, 설정)],
    }).end();
    return;
  }

  res.writeHead(302, {
    Location: `/login?오류=${encodeURIComponent(결과.사유 ?? '')}`,
    'Set-Cookie': 지울상태,
  }).end();
}

// api/auth-invite.js 와 같은 내용을 node:http 의 res 로 옮겨 적은 것이다.
async function 초대처리(req, res) {
  const 설정 = 설정읽기();
  const 신원 = 세션읽기(쿠키읽기(req.headers.cookie, 신원쿠키이름), 설정.세션비밀);
  if (!신원) {
    json(res, 401, { error: '로그인부터 다시 해 주십시오.' });
    return;
  }

  const 몸 = await 본문읽기(req);
  const 결과 = await 인증가져오기().초대확인({ 코드: 몸?.코드 ?? '', 신원 });
  if (!결과.통과) {
    json(res, 400, { error: '초대 코드가 맞지 않습니다.' });
    return;
  }

  const 세션 = 세션만들기(결과.사용자, 설정.세션비밀);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Set-Cookie': [쿠키지우기(신원쿠키이름, 설정), 쿠키만들기(세션쿠키이름, 세션, 서른일, 설정)],
  }).end(JSON.stringify({ 닉네임: 결과.사용자.닉네임 }));
}

async function handle(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/auth-start') {
      const { 위치, state } = 인증가져오기().로그인시작();
      res.writeHead(302, {
        Location: 위치,
        'Set-Cookie': 쿠키만들기(상태쿠키이름, state, 짧은쿠키수명초, 설정읽기()),
      }).end();
      return;
    }
    if (url.pathname === '/api/auth-callback') {
      await 로그인완료처리(req, res, url);
      return;
    }
    if (url.pathname === '/api/auth-invite' && req.method === 'POST') {
      await 초대처리(req, res);
      return;
    }
    if (url.pathname === '/api/auth-logout' && req.method === 'POST') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Set-Cookie': 쿠키지우기(세션쿠키이름, 설정읽기()),
      }).end(JSON.stringify({ 나감: true }));
      return;
    }
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
