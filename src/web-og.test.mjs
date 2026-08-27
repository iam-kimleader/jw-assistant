// 웹 공유 메타데이터와 OG 이미지 파일 구성을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const html = readFileSync('web/index.html', 'utf8');
const image = readFileSync('asset/og-image-jw-assistant.png');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const viteConfig = readFileSync('vite.config.ts', 'utf8');

test('Open Graph와 Twitter Card가 공개 OG 이미지 주소를 사용한다', () => {
  const imageUrl = 'https://jw-assistant-seven.vercel.app/og-image-jw-assistant.png';
  assert.match(html, new RegExp(`<meta property="og:image" content="${imageUrl.replaceAll('.', '\\.')}"`));
  assert.match(html, new RegExp(`<meta name="twitter:image" content="${imageUrl.replaceAll('.', '\\.')}"`));
  assert.match(html, /<meta property="og:title" content="JW 성경 연구 도우미">/);
  assert.match(html, /<meta property="og:description"/);
});

test('OG 이미지의 실제 크기와 메타데이터 크기가 일치한다', () => {
  assert.equal(image.subarray(1, 4).toString('ascii'), 'PNG');
  assert.equal(image.readUInt32BE(16), 1448);
  assert.equal(image.readUInt32BE(20), 1086);
  assert.match(html, /<meta property="og:image:width" content="1448">/);
  assert.match(html, /<meta property="og:image:height" content="1086">/);
});

test('OG 이미지는 빌드 산출물 루트로 복사되어 공개 경로에서 그대로 열린다', () => {
  // asset/ 을 Vite 의 public 폴더로 삼았다. rewrite 없이 /og-image-jw-assistant.png 로 나간다.
  assert.match(viteConfig, /publicDir: '\.\.\/asset'/);
  assert.equal(existsSync('asset/og-image-jw-assistant.png'), true);
});

test('Vercel이 화면 경로를 index.html 로 넘겨 라우터가 받게 한다', () => {
  for (const 경로 of ['/life-ministry', '/watchtower', '/talk', '/login', '/invite']) {
    assert.ok(
      vercel.rewrites.some(r => r.source === 경로 && r.destination === '/index.html'),
      `${경로} rewrite 가 없다`);
  }
});

test('Vercel이 빌드 명령과 산출물 폴더를 가리킨다', () => {
  assert.equal(vercel.buildCommand, 'npm run build:web');
  assert.equal(vercel.outputDirectory, 'web/dist');
});

test('Vercel 함수는 WOL과 사용자에 가까운 서울 리전에서 실행한다', () => {
  assert.deepEqual(vercel.regions, ['icn1']);
});
