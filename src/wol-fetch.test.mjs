// WOL 문서와 이미지 바이너리 다운로드 동작을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { fetchBinary, resolveRedirect } from './wol-fetch.mjs';

test('이미지를 바이트와 콘텐츠 유형으로 받는다', async t => {
  const expected = Buffer.from('fake-png-bytes');
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png; charset=binary' });
    res.end(expected);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const address = server.address();
  const result = await fetchBinary(`http://127.0.0.1:${address.port}/image.png`);
  assert.equal(result.contentType, 'image/png');
  assert.deepEqual(result.bytes, expected);
});

test('참고 자료 리디렉션의 정확한 문단 범위를 보존한다', async t => {
  const server = createServer((_req, res) => {
    res.writeHead(307, { Location: '/ko/wol/d/r8/lp-ko/2002161#h=4:0-11:0' });
    res.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));

  const address = server.address();
  const result = await resolveRedirect(`http://127.0.0.1:${address.port}/reference`);
  assert.equal(result, `http://127.0.0.1:${address.port}/ko/wol/d/r8/lp-ko/2002161#h=4:0-11:0`);
});
