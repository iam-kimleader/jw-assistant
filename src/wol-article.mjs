// WOL 파수대와 대화형 연구 기사에서 질문·문단·인용 성구 구조를 뽑는 파서
import { 링크들, 문단들, 문서인용수세기, 속성값, 요소들, 인용뽑기, 파라넘, 텍스트 } from './wol-html.mjs';

const 질문불용어 = new Set(['어떻게', '무엇', '있습니까', '했습니까', '합니까', '하는', '통해', '다음', '같이', '대해']);

function 질문검색어(질문) {
  return [...new Set(텍스트(질문)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .map(낱말 => 낱말.replace(/(?:에게서는|에게서|께서는|에서는|으로써|으로|처럼|보다|부터|까지|에게|께서|에서|하고|이며|이나|거나|은|는|이|가|을|를|의|에|와|과|도|만|로)$/u, ''))
    .filter(낱말 => 낱말.length >= 2 && !질문불용어.has(낱말)))];
}

function 관련문단먼저(문단들, 질문) {
  const 검색어 = 질문검색어(질문);
  return 문단들
    .map((문단, index) => ({ 문단, index, 점수: 검색어.filter(낱말 => 문단.includes(낱말)).length }))
    .sort((a, b) => b.점수 - a.점수 || a.index - b.index)
    .map(item => item.문단);
}

function 직전소제목(소제목들, index) {
  let 직전 = '';
  for (const 소제목 of 소제목들) {
    if (소제목.index >= index) break;
    직전 = 소제목.텍스트;
  }
  return 직전;
}

function 삽화뽑기(html) {
  const 삽화 = [];
  const 이미지 = /<img\b([^>]*)>/g;
  let m;
  while ((m = 이미지.exec(html))) {
    const src = 속성값(m[1], 'src');
    if (!src) continue;
    삽화.push({
      url: new URL(src, 'https://wol.jw.org').href,
      alt: 텍스트(속성값(m[1], 'alt') ?? ''),
    });
  }
  return 삽화;
}

function 참고출판물뽑기(본문) {
  return 링크들(본문)
    .filter(link => link.href && /\/wol\/pc\//.test(link.href))
    .map(link => ({
      표시: link.텍스트,
      url: new URL(link.href, 'https://wol.jw.org').href,
    }));
}

function 대화형질문그룹(html) {
  const 본문시작 = html.search(/<div\b(?=[^>]*class="[^"]*\bbodyTxt\b)[^>]*>/);
  const 토의시작 = html.indexOf('토의해 보십시오', 본문시작);
  const 근거문단 = 본문시작 >= 0 && 토의시작 > 본문시작
    ? 문단들(html.slice(본문시작, 토의시작))
      .filter(p => !/class="[^"]*\bcontextTtl\b/.test(p.속성))
      .map(p => 텍스트(p.본문))
      .filter(Boolean)
    : [];

  const 소제목들 = 요소들(html, ['h2', 'h3']).map(요소 => ({ index: 요소.index, 텍스트: 요소.텍스트 }));
  const 모든문단 = 요소들(html, ['p']);
  const 질문들 = [];
  const 질문앞답칸 = /<p\b([^>]*)>((?:(?!<\/p>)[\s\S])*)<\/p>\s*<div\b(?=[^>]*class="[^"]*\bgen-field\b)[^>]*>/g;
  let m;
  while ((m = 질문앞답칸.exec(html))) {
    const 질문 = 텍스트(m[2]);
    질문들.push({
      index: m.index,
      질문,
      문단번호: [],
      문단본문: 관련문단먼저(근거문단, 질문),
      인용: 인용뽑기(m[2]),
      참고출판물: 참고출판물뽑기(m[2]),
      소제목: 직전소제목(소제목들, m.index),
    });
  }

  return 질문들.map((항목, index) => {
    const 소제목시작 = [...소제목들].reverse().find(소제목 => 소제목.index < 항목.index)?.index ?? 본문시작;
    const 상위질문 = /[?？]/.test(항목.질문) ? '' : [...모든문단]
      .reverse()
      .find(문단 => 문단.index < 항목.index && 문단.index > 소제목시작 && /다음과 같이/.test(문단.텍스트) && /[?？]/.test(문단.텍스트))?.텍스트 ?? '';
    const 다음질문시작 = 질문들[index + 1]?.index ?? html.length;
    const 삽화 = /삽화/.test(항목.질문) ? 삽화뽑기(html.slice(항목.index, 다음질문시작)) : [];
    return {
      질문: 항목.질문,
      상위질문,
      소제목: 항목.소제목,
      삽화,
      문단번호: 항목.문단번호,
      문단본문: 관련문단먼저(근거문단, [상위질문, 항목.질문].filter(Boolean).join(' ')),
      인용: 항목.인용,
      참고출판물: 항목.참고출판물,
    };
  });
}

export function parseArticle(html) {
  const ps = 요소들(html, ['p']);
  const 소제목들 = 요소들(html, ['h2', 'h3']).map(요소 => ({ index: 요소.index, 텍스트: 요소.텍스트 }));

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
    그룹.set(pid, {
      질문: 텍스트(p.본문),
      문단번호: [],
      문단본문: [],
      인용: 인용뽑기(p.본문),
      참고출판물: 참고출판물뽑기(p.본문),
      소제목: 직전소제목(소제목들, p.index),
      삽화: [],
      _index: p.index,
    });
    순서.push(pid);
  }
  if (!그룹.size) {
    for (const [i, item] of 대화형질문그룹(html).entries()) {
      const pid = `interactive-${i + 1}`;
      그룹.set(pid, item);
      순서.push(pid);
    }
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

  const 문단그룹 = 순서.map((pid, index) => {
    const 항목 = 그룹.get(pid);
    if (항목._index !== undefined && /삽화/.test(항목.질문)) {
      const 다음시작 = 그룹.get(순서[index + 1])?._index ?? html.length;
      항목.삽화 = 삽화뽑기(html.slice(항목._index, 다음시작));
    }
    const { _index, ...공개항목 } = 항목;
    return 공개항목;
  });

  return {
    주라벨: 텍스트(주라벨p.본문),
    제목: 텍스트(제목m[1]),
    노래: 노래p ? 텍스트(노래p.본문) : '',
    요점,
    주제성구,
    문단그룹,
    문서인용수: 문서인용수세기(html),
  };
}
