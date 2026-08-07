// 생활과 봉사 교재에서 준비 대상 섹션을 뽑는 모듈
import { 요소들, 링크들, 인용뽑기, 텍스트 } from './wol-html.mjs';

const 서책심벌 = {
  용하: 'rr',
  순: 'rr',
};

function 다음제목전까지(blocks, 시작, 태그) {
  let 끝 = blocks.length;
  for (let i = 시작 + 1; i < blocks.length; i++) {
    if (blocks[i].태그 === 태그) {
      끝 = i;
      break;
    }
  }
  return blocks.slice(시작 + 1, 끝);
}

function 질문인가(text) {
  return /\?/.test(text) && !/낭독/.test(text) && !/기도/.test(text);
}

function 번호(text) {
  return (String(text).match(/^(\d+(?:[-,]\s*\d+)?)/) || [])[1] ?? '';
}

export function parseMinistryMeeting(html) {
  const blocks = 요소들(html);
  const 주라벨 = blocks.find(b => b.태그 === 'h1')?.텍스트 ?? '';
  const 성경범위 = blocks.find(b => b.태그 === 'h2' && !/성경에 담긴 보물|야외 봉사|그리스도인 생활/.test(b.텍스트))?.텍스트 ?? '';

  const 보물시작 = blocks.findIndex(b => b.태그 === 'h3' && /영적 보물 찾기/.test(b.텍스트));
  const 보물블록 = 보물시작 >= 0 ? 다음제목전까지(blocks, 보물시작, 'h3') : [];
  const 영적보물질문 = 보물블록
    .filter(b => ['p', 'li'].includes(b.태그) && 질문인가(b.텍스트))
    .map((b, i) => ({
      id: `gem-${i + 1}`,
      번호: 번호(b.텍스트) || `영적 보물 ${i + 1}`,
      질문: b.텍스트,
      문단본문: [],
      인용: 인용뽑기(b.본문),
    }));

  const 연구시작 = blocks.findIndex(b => b.태그 === 'h3' && /회중 성서 연구/.test(b.텍스트));
  const 연구블록 = 연구시작 >= 0 ? 다음제목전까지(blocks, 연구시작, 'h3') : [];
  const 연구본문 = 연구블록.find(b => 링크들(b.본문).length) ?? null;
  const 연구링크 = 연구본문 ? 링크들(연구본문.본문)[0] : null;
  const 연구라벨 = 연구링크?.텍스트 ?? 연구본문?.텍스트 ?? '';
  const m = 연구라벨.match(/「([^」]+)」\s*(\d+)장/);
  const 회중성서연구 = 연구라벨 ? {
    제목: 연구라벨,
    href: 연구링크?.href ?? null,
    서책명: m?.[1] ?? '',
    장: m ? Number(m[2]) : null,
    심벌: m ? 서책심벌[m[1]] ?? null : null,
  } : null;

  return { 주라벨, 성경범위, 영적보물질문, 회중성서연구 };
}

export function findPublicationChapter(indexHtml, chapterNumber) {
  const links = 링크들(indexHtml);
  const hit = links.find(l => new RegExp(`(^|\\s)${chapterNumber}장(\\s|$)`).test(l.텍스트));
  if (!hit?.href) return null;
  return hit.href.startsWith('http') ? hit.href : `https://wol.jw.org${hit.href}`;
}

export function readingRangeNote(성경범위) {
  if (!성경범위) return '';
  return `${성경범위} 범위에서 여호와의 성품, 경고, 위로, 실천할 점 중 하나를 골라 답변을 보강할 수 있습니다.`;
}
