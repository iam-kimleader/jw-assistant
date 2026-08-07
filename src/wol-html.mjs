// WOL HTML 조각에서 텍스트와 성구 앵커를 뽑는 공통 도우미
import { htmlToText } from './html-text.mjs';

const 앵커 = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const 열린스팬 = /<span\b([^>]*)>/g;

export const 속성값 = (속성, 이름) => (String(속성).match(new RegExp(`${이름}="([^"]*)"`)) || [])[1] ?? null;
export const 클래스목록 = 속성 => (속성값(속성, 'class') || '').split(/\s+/).filter(Boolean);
export const 텍스트 = html => htmlToText(html);

export function 요소들(html, 태그들 = ['h1', 'h2', 'h3', 'p', 'li']) {
  const out = [];
  const re = new RegExp(`<(${태그들.join('|')})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'g');
  let m;
  while ((m = re.exec(html))) {
    out.push({ 태그: m[1], 속성: m[2], 본문: m[3], 텍스트: 텍스트(m[3]), index: m.index });
  }
  return out;
}

export function 문단들(html) {
  return 요소들(html, ['p']).map(p => ({ 속성: p.속성, 본문: p.본문 }));
}

export function 인용앵커인가(속성) {
  const href = 속성값(속성, 'href');
  return !!href && /\/wol\/bc\//.test(href) && !!속성값(속성, 'data-bid') && 클래스목록(속성).includes('b');
}

export function 인용뽑기(본문) {
  const out = [];
  앵커.lastIndex = 0;
  let m;
  while ((m = 앵커.exec(본문))) {
    const 속성 = m[1];
    if (!인용앵커인가(속성)) continue;
    const 뒤 = 본문.slice(앵커.lastIndex, 앵커.lastIndex + 60);
    out.push({
      bid: 속성값(속성, 'data-bid'),
      라벨: 텍스트(m[2]),
      낭독: /낭독/.test(텍스트(뒤).slice(0, 8)),
    });
  }
  return out;
}

export function 문서인용수세기(html) {
  const 전체앵커 = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
  let n = 0;
  let m;
  while ((m = 전체앵커.exec(html))) {
    if (인용앵커인가(m[1])) n++;
  }
  return n;
}

export function 파라넘(본문) {
  열린스팬.lastIndex = 0;
  let m;
  while ((m = 열린스팬.exec(본문))) {
    if (클래스목록(m[1]).includes('parNum')) return 속성값(m[1], 'data-pnum');
  }
  return null;
}

export function 링크들(본문) {
  const out = [];
  앵커.lastIndex = 0;
  let m;
  while ((m = 앵커.exec(본문))) {
    out.push({ href: 속성값(m[1], 'href'), 텍스트: 텍스트(m[2]), 속성: m[1] });
  }
  return out;
}
