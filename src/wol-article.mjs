// wol 파수대 연구 기사 HTML 에서 질문·문단·인용 성구 구조를 뽑아내는 파서
import { htmlToText as 텍스트 } from './html-text.mjs';

// 속성 순서에 기대지 않는다 — <a ...>...</a> 를 통째로 잡은 뒤 안에서 href·data-bid·class 를 따로 확인한다
const 앵커 = /<a\b([^>]*)>([\s\S]*?)<\/a>/g;
const 열린스팬 = /<span\b([^>]*)>/g;

// <p ...>...</p> 를 순서대로 모두 잘라낸다. 속성과 본문을 함께 준다
function 문단들(html) {
  const out = [];
  const re = /<p\b([^>]*)>([\s\S]*?)<\/p>/g;
  let m;
  while ((m = re.exec(html))) out.push({ 속성: m[1], 본문: m[2] });
  return out;
}

const 속성값 = (속성, 이름) => (속성.match(new RegExp(`${이름}="([^"]*)"`)) || [])[1] ?? null;
const 클래스목록 = 속성 => (속성값(속성, 'class') || '').split(/\s+/).filter(Boolean);

// href 가 /ko/wol/bc/ 로 시작하고 data-bid 가 있고 class 목록에 낱말 b 가 있는 앵커만 인용으로 본다
function 인용앵커인가(속성) {
  const href = 속성값(속성, 'href');
  return !!href && href.startsWith('/ko/wol/bc/') && !!속성값(속성, 'data-bid') && 클래스목록(속성).includes('b');
}

function 인용뽑기(본문) {
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

// class="parNum" 인 <span> 의 data-pnum 을 속성 순서에 상관없이 찾는다
function 파라넘(본문) {
  열린스팬.lastIndex = 0;
  let m;
  while ((m = 열린스팬.exec(본문))) {
    if (클래스목록(m[1]).includes('parNum')) return 속성값(m[1], 'data-pnum');
  }
  return null;
}

export function parseArticle(html) {
  const ps = 문단들(html);

  const 주라벨p = ps.find(p => /class="[^"]*\bcontextTtl\b/.test(p.속성));
  const 제목m = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/);
  if (!주라벨p || !제목m) throw new Error('기사 구조를 찾을 수 없다 — 주 라벨이나 제목이 없다');

  const 노래p = ps.find(p => /class="[^"]*\bpubRefs\b/.test(p.속성) && /노래/.test(텍스트(p.본문)));
  const 주제p = ps.find(p => /class="[^"]*\bthemeScrp\b/.test(p.속성));

  // "요점" 이라는 낱말만 든 문단 바로 다음 문단이 요점 본문이다
  const 요점표시 = ps.findIndex(p => 텍스트(p.본문) === '요점');
  const 요점 = 요점표시 >= 0 && ps[요점표시 + 1] ? 텍스트(ps[요점표시 + 1].본문) : '';

  let 주제성구 = null;
  if (주제p) {
    const c = 인용뽑기(주제p.본문)[0];
    const 인용문m = 주제p.본문.match(/<em\b[^>]*>([\s\S]*?)<\/em>/);
    if (c) 주제성구 = { 인용문: 인용문m ? 텍스트(인용문m[1]) : '', 라벨: c.라벨, bid: c.bid };
  }

  // 질문 문단(class="qu")을 pid 로 색인하고, data-rel-pid 를 가진 문단을 그 아래에 붙인다
  const 그룹 = new Map();
  const 순서 = [];
  for (const p of ps) {
    if (!/class="[^"]*\bqu\b/.test(p.속성)) continue;
    const pid = 속성값(p.속성, 'data-pid');
    if (!pid) continue;
    그룹.set(pid, { 질문: 텍스트(p.본문), 문단번호: [], 인용: 인용뽑기(p.본문) });
    순서.push(pid);
  }
  if (!그룹.size) throw new Error('기사 구조를 찾을 수 없다 — 질문 문단이 하나도 없다');

  for (const p of ps) {
    const rel = 속성값(p.속성, 'data-rel-pid');
    if (!rel) continue;
    // data-rel-pid 는 "[46]" 처럼 하나일 수도, "[49, 50]" 처럼 여럿일 수도 있다 — 걸린 그룹 전부에 붙인다
    const pid들 = rel.replace(/[[\]]/g, '').split(',').map(s => s.trim()).filter(Boolean);
    const pnum = 파라넘(p.본문);
    const 인용 = 인용뽑기(p.본문);
    for (const pid of pid들) {
      const 대상 = 그룹.get(pid);
      if (!대상) continue;
      if (pnum) 대상.문단번호.push(Number(pnum));
      대상.인용.push(...인용);
    }
  }

  return {
    주라벨: 텍스트(주라벨p.본문),
    제목: 텍스트(제목m[1]),
    노래: 노래p ? 텍스트(노래p.본문) : '',
    요점,
    주제성구,
    문단그룹: 순서.map(pid => 그룹.get(pid)),
  };
}
