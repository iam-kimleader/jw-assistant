// WOL 야외 봉사 색인을 봉사모임 주제 목록으로 바꾸는 파서
import { htmlToText } from './html-text.mjs';

function 클래스들(여는태그) {
  const m = 여는태그.match(/\bclass\s*=\s*"([^"]*)"/);
  return m ? m[1].trim().split(/\s+/) : [];
}

function 링크들(본문) {
  const 결과 = [];
  for (const m of 본문.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
    const href = m[1].match(/\bhref\s*=\s*"([^"]*)"/)?.[1] ?? '';
    if (!href.includes('/wol/pc/')) continue;
    const 표시 = htmlToText(m[2]).replace(/[;,\s]+$/, '').trim();
    if (표시) 결과.push({ 표시, pc: href });
  }
  return 결과;
}

// 라벨은 첫 pc 앵커 앞까지다.
// 콜론으로 자르면 「… (롬 10:10)」 같은 라벨이 「… (롬 10」에서 잘리고,
// 첫 <a> 로 자르면 그 성구 자체가 앵커라 「… (」에서 잘린다.
// pc 링크가 없는 항목만 첫 콜론으로 자른다.
function 라벨뽑기(본문) {
  const pc = 본문.search(/<a\b[^>]*href="[^"]*\/wol\/pc\//);
  const 앞 = pc >= 0 ? 본문.slice(0, pc) : 본문;
  const 글 = htmlToText(앞).trim().replace(/:\s*$/, '').trim();
  return pc >= 0 ? 글 : 글.split(':')[0].trim();
}

export function parseTopicIndex(html) {
  const 주제들 = {};
  let 소제목 = 0;
  let 하위 = 0;
  let 링크 = 0;
  let 직전소제목 = null;

  for (const m of String(html).matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/g)) {
    const classes = 클래스들(m[1]);
    const 소 = classes.includes('su');
    const 하 = classes.includes('sv');
    if (!소 && !하) continue;

    const 라벨 = 라벨뽑기(m[2]);
    if (!라벨) continue;

    const 참고 = 링크들(m[2]);
    주제들[라벨] = { 상위: 소 ? null : 직전소제목, 참고 };
    링크 += 참고.length;
    if (소) {
      소제목 += 1;
      직전소제목 = 라벨;
    } else {
      하위 += 1;
    }
  }

  return { 주제들, 통계: { 소제목, 하위, 링크 } };
}
