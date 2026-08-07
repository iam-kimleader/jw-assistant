// 답변 화면의 참고 출판물 링크와 답변 전용 복사 동작을 검증하는 테스트
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('web/index.html', 'utf8');
const app = readFileSync('web/app.js', 'utf8');
const css = readFileSync('web/styles.css', 'utf8');

test('답변 템플릿에 참고 출판물 영역이 있다', () => {
  assert.match(html, /class="publication-references"/);
  assert.match(css, /\.publication-reference a/);
});

test('참고 출판물은 새 창에서 열리는 안전한 링크로 렌더링한다', () => {
  assert.match(app, /link\.target = '_blank'/);
  assert.match(app, /link\.rel = 'noopener noreferrer'/);
  assert.match(app, /reference\.표시 \|\| reference\.제목/);
});

test('클립보드에는 답변 본문만 전달한다', () => {
  assert.match(app, /function copyText\(answer\) \{\s*return answer\.답변;\s*\}/);
});
