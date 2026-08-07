// WOL 문서를 캐시하며 받아오는 모듈
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { setDefaultResultOrder } from 'node:dns';
import { get } from 'node:https';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const 캐시디렉토리 = process.env.VERCEL ? join(tmpdir(), 'jw-assistant-wol') : '.cache/wol';
const 요청헤더 = {
  'User-Agent': 'Mozilla/5.0',
  'Accept-Encoding': 'identity',
};
const 바이너리캐시 = new Map();

try {
  setDefaultResultOrder('ipv4first');
} catch {
  // DNS 순서 제어를 지원하지 않는 런타임에서도 기본 fetch 흐름은 계속 사용할 수 있다.
}

function 오류요약(e) {
  return [e?.message, e?.cause?.code, e?.cause?.message].filter(Boolean).join(' / ');
}

async function 기본Fetch(url) {
  const r = await fetch(url, { headers: 요청헤더 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return await r.text();
}

async function 기본BinaryFetch(url) {
  const r = await fetch(url, { headers: 요청헤더 });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return {
    bytes: Buffer.from(await r.arrayBuffer()),
    contentType: r.headers.get('content-type')?.split(';')[0] ?? 'application/octet-stream',
  };
}

function httpsFetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: 요청헤더, timeout: 30000 }, res => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location && redirectCount < 5) {
        res.resume();
        resolve(httpsFetch(new URL(location, url).toString(), redirectCount + 1));
        return;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status}`));
        return;
      }

      res.setEncoding('utf8');
      let html = '';
      res.on('data', chunk => {
        html += chunk;
      });
      res.on('end', () => resolve(html));
    });

    req.on('timeout', () => req.destroy(new Error(`요청 시간이 초과되었다: ${url}`)));
    req.on('error', reject);
  });
}

function httpsBinaryFetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: 요청헤더, timeout: 30000 }, res => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      if ([301, 302, 303, 307, 308].includes(status) && location && redirectCount < 5) {
        res.resume();
        resolve(httpsBinaryFetch(new URL(location, url).toString(), redirectCount + 1));
        return;
      }

      if (status < 200 || status >= 300) {
        res.resume();
        reject(new Error(`HTTP ${status}`));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(Buffer.from(chunk)));
      res.on('end', () => resolve({
        bytes: Buffer.concat(chunks),
        contentType: String(res.headers['content-type'] ?? 'application/octet-stream').split(';')[0],
      }));
    });

    req.on('timeout', () => req.destroy(new Error(`요청 시간이 초과되었다: ${url}`)));
    req.on('error', reject);
  });
}

async function 원격문서(url) {
  try {
    return await 기본Fetch(url);
  } catch (fetchError) {
    try {
      return await httpsFetch(url);
    } catch (httpsError) {
      throw new Error(`${url} 를 받지 못했다 — fetch ${오류요약(fetchError)}; https ${오류요약(httpsError)}`);
    }
  }
}

async function 원격바이너리(url) {
  try {
    return await 기본BinaryFetch(url);
  } catch (fetchError) {
    try {
      return await httpsBinaryFetch(url);
    } catch (httpsError) {
      throw new Error(`${url} 를 받지 못했다 — fetch ${오류요약(fetchError)}; https ${오류요약(httpsError)}`);
    }
  }
}

export async function fetchCached(url, cacheName, cacheDir = 캐시디렉토리) {
  const 경로 = join(cacheDir, cacheName);
  if (existsSync(경로)) return readFileSync(경로, 'utf8');
  const html = await 원격문서(url);
  try {
    mkdirSync(cacheDir, { recursive: true });
    writeFileSync(경로, html, 'utf8');
  } catch {
    // Vercel 같은 서버리스 환경에서는 캐시 쓰기가 실패해도 응답 자체는 사용할 수 있어야 한다.
  }
  return html;
}

export async function fetchBinary(url) {
  if (!바이너리캐시.has(url)) 바이너리캐시.set(url, 원격바이너리(url));
  try {
    return await 바이너리캐시.get(url);
  } catch (error) {
    바이너리캐시.delete(url);
    throw error;
  }
}

function httpsRedirect(url) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: 요청헤더, timeout: 30000 }, res => {
      const status = res.statusCode ?? 0;
      const location = res.headers.location;
      res.resume();
      if ([301, 302, 303, 307, 308].includes(status) && location) {
        resolve(new URL(location, url).href);
        return;
      }
      reject(new Error(`HTTP ${status} 응답에 Location 헤더가 없다.`));
    });
    req.on('timeout', () => req.destroy(new Error(`리디렉션 확인 시간이 초과되었다. ${url}`)));
    req.on('error', reject);
  });
}

export async function resolveRedirect(url) {
  try {
    const response = await fetch(url, {
      headers: 요청헤더,
      redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
    const location = response.headers.get('location');
    await response.body?.cancel();
    if ([301, 302, 303, 307, 308].includes(response.status) && location) return new URL(location, url).href;
    throw new Error(`HTTP ${response.status} 응답에 Location 헤더가 없다.`);
  } catch (fetchError) {
    try {
      return await httpsRedirect(url);
    } catch (httpsError) {
      throw new Error(`${url}의 연결 문서를 찾지 못했다. fetch ${fetchError.message}; https ${httpsError.message}`);
    }
  }
}
