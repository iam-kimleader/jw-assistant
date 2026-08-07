// wol 파수대 연구 기사 HTML 에서 질문·문단·인용 성구 구조를 뽑아내는 파서
import { 문단들, 문서인용수세기, 속성값, 인용뽑기, 파라넘, 텍스트 } from './wol-html.mjs';

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
    // themeScrp 문단에 성구 링크가 둘 이상일 수 있다(예 —마태복음 24:14; 28:19, 20).
    // 전체를 인용목록에 담아 둘째부터 조용히 사라지지 않게 한다. 라벨·bid·인용문은
    // 첫 인용을 가리키는 기존 필드 그대로 두어 이미 이 필드를 쓰는 곳을 깨지 않는다.
    const 인용목록 = 인용뽑기(주제p.본문);
    const c = 인용목록[0];
    const 인용문m = 주제p.본문.match(/<em\b[^>]*>([\s\S]*?)<\/em>/);
    if (c) 주제성구 = { 인용문: 인용문m ? 텍스트(인용문m[1]) : '', 라벨: c.라벨, bid: c.bid, 인용목록 };
  }

  // 질문 문단(class="qu")을 pid 로 색인하고, data-rel-pid 를 가진 문단을 그 아래에 붙인다
  const 그룹 = new Map();
  const 순서 = [];
  for (const p of ps) {
    if (!/class="[^"]*\bqu\b/.test(p.속성)) continue;
    const pid = 속성값(p.속성, 'data-pid');
    if (!pid) continue;
    그룹.set(pid, { 질문: 텍스트(p.본문), 문단번호: [], 문단본문: [], 인용: 인용뽑기(p.본문) });
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
    const 본문텍스트 = 텍스트(p.본문).replace(/^\d+\s+/, '');
    for (const pid of pid들) {
      const 대상 = 그룹.get(pid);
      if (!대상) continue;
      if (pnum) 대상.문단번호.push(Number(pnum));
      if (본문텍스트) 대상.문단본문.push(본문텍스트);
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
    문서인용수: 문서인용수세기(html),
  };
}
