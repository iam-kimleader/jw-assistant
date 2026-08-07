// 질문과 성구 근거를 웹 화면용 답변 초안으로 바꾸는 모듈
import { resolveAll } from './citation-parse.mjs';
import { formatAddress } from './verse-address.mjs';

function 문장나누기(text) {
  return String(text)
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);
}

function 질문번호제거(text) {
  return String(text).replace(/^\s*\d+(?:[-,]\s*\d+)?\.\s*/, '').trim();
}

function 성구본문(도구, 주소들) {
  return 주소들.map(a => ({
    주소: formatAddress(도구.index, a.verseId),
    본문: 도구.text.verse(a.book, a.chapter, a.verse) ?? '(본문 없음)',
  }));
}

function 핵심문장(문단본문, 최대 = 3) {
  const 문장들 = 문장나누기(문단본문.join(' ')).filter(s => !/^\(?\d+분\)?/.test(s));
  return 문장들.slice(0, 최대);
}

export function buildAnswerDraft(항목, 도구) {
  const 질문 = 질문번호제거(항목.질문);
  const 해석들 = resolveAll(도구.index, 항목.인용 ?? []);
  const 성구 = [];
  const 미해결 = [];
  for (const c of 해석들) {
    if (!c.해석.성공) {
      미해결.push({ 라벨: c.라벨, 사유: c.해석.사유 });
      continue;
    }
    성구.push({ 라벨: c.라벨, 낭독: !!c.낭독, 본문: 성구본문(도구, c.해석.주소들) });
  }

  const 핵심 = 핵심문장(항목.문단본문 ?? []);
  const 답변줄 = [];
  if (핵심.length) {
    답변줄.push(`문단의 흐름을 근거로 보면 ${핵심.join(' ')}`);
  } else if (성구.length) {
    답변줄.push(`이 질문은 아래 성구 표현을 중심으로 답할 수 있습니다.`);
  } else {
    답변줄.push('이 질문은 자료를 직접 읽고 핵심 표현을 정리해 답해야 합니다.');
  }
  if (성구.length) {
    const 첫성구 = 성구[0].본문.map(v => `${v.주소}은(는) "${v.본문}"라고 말합니다`).join(' ');
    답변줄.push(`성구 근거로는 ${첫성구}.`);
  }
  if (!핵심.length && !성구.length) {
    답변줄.push('출판물 근거 미확인 — 내 정리임.');
  }

  return {
    id: 항목.id,
    번호: 항목.번호,
    질문,
    원질문: 항목.질문,
    문단번호: 항목.문단번호 ?? [],
    답변: 답변줄.join(' '),
    핵심문장: 핵심,
    성구,
    미해결,
    출처URL: 항목.출처URL,
  };
}

export function buildArticleAnswers(기사, 도구, 출처URL) {
  return 기사.문단그룹.map((g, i) => buildAnswerDraft({
    id: `q-${i + 1}`,
    번호: g.문단번호?.length ? g.문단번호.join(', ') : String(i + 1),
    질문: g.질문,
    문단번호: g.문단번호,
    문단본문: g.문단본문,
    인용: g.인용,
    출처URL,
  }, 도구));
}
