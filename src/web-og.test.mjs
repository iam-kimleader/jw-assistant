// 웹 공유 메타데이터와 OG 이미지 파일 구성을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('web/index.html', 'utf8');
const image = readFileSync('asset/og-image-jw-assistant.png');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

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

test('Vercel이 공개 OG 이미지 경로를 원본 파일로 연결한다', () => {
  assert.ok(vercel.rewrites.some(rewrite =>
    rewrite.source === '/og-image-jw-assistant.png'
    && rewrite.destination === '/asset/og-image-jw-assistant.png'));
});

test('Vercel 함수는 WOL과 사용자에 가까운 서울 리전에서 실행한다', () => {
  assert.deepEqual(vercel.regions, ['icn1']);
});
