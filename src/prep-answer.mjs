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

const 질문불용어 = new Set(['어떻게', '무엇을', '무엇', '있습니까', '합니까', '하는', '것은', '것의', '대해']);

function 질문낱말(text) {
  return [...new Set(String(text)
    .replace(/\([ㄱ-ㅎ]\)/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(낱말 => 낱말.length >= 2 && !질문불용어.has(낱말)))];
}

function 질문나누기(text) {
  const 질문 = 질문번호제거(text);
  const 표시들 = [...질문.matchAll(/\(([ㄱ-ㅎ])\)\s*/g)];
  if (표시들.length < 2) return [{ 구분: '', 질문 }];

  const 공통문맥 = 질문.slice(0, 표시들[0].index).trim();
  return 표시들.map((표시, index) => {
    const 끝 = 표시들[index + 1]?.index ?? 질문.length;
    const 하위질문 = 질문.slice(표시.index + 표시[0].length, 끝).trim();
    return {
      구분: `(${표시[1]})`,
      질문: [공통문맥, 하위질문].filter(Boolean).join(' '),
    };
  });
}

function 성구본문(도구, 주소들) {
  return 주소들.map(a => ({
    주소: formatAddress(도구.index, a.verseId),
    본문: 도구.text.verse(a.book, a.chapter, a.verse) ?? '(본문 없음)',
  }));
}

function 핵심문장(문단본문, 질문, 최대 = 3) {
  const 문장들 = 문장나누기(문단본문.join(' ')).filter(s => !/^\(?\d+분\)?/.test(s));
  const 낱말들 = 질문낱말(질문);
  return 문장들
    .map((문장, index) => ({ 문장, index, 점수: 낱말들.filter(낱말 => 문장.includes(낱말)).length }))
    .sort((a, b) => b.점수 - a.점수 || a.index - b.index)
    .slice(0, 최대)
    .map(item => item.문장);
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

  const 핵심 = 핵심문장(항목.문단본문 ?? [], [항목.상위질문, 질문].filter(Boolean).join(' '));
  const 답변줄 = [];
  if (핵심.length) {
    답변줄.push(핵심.join(' '));
  } else if (성구.length) {
    답변줄.push(성구.flatMap(group => group.본문).slice(0, 2).map(verse => verse.본문).join(' '));
  } else {
    답변줄.push('이 질문은 자료를 직접 읽고 핵심 표현을 정리해 답해야 합니다.');
  }
  if (!핵심.length && !성구.length) {
    답변줄.push('출판물 근거 미확인 — 내 정리임.');
  }

  return {
    id: 항목.id,
    번호: 항목.번호,
    질문,
    원질문: 항목.원질문 ?? 항목.질문,
    상위질문: 항목.상위질문 ?? '',
    소제목: 항목.소제목 ?? '',
    삽화: 항목.삽화 ?? [],
    문단번호: 항목.문단번호 ?? [],
    답변: 답변줄.join(' '),
    핵심문장: 핵심,
    참고출판물: 항목.참고출판물 ?? [],
    성구,
    미해결,
    출처URL: 항목.출처URL,
  };
}

export function buildArticleAnswers(기사, 도구, 출처URL) {
  return 기사.문단그룹.flatMap((g, i) => {
    const 질문들 = 질문나누기(g.질문);
    return 질문들.map((하위, 하위번호) => buildAnswerDraft({
      id: 질문들.length > 1 ? `q-${i + 1}-${하위번호 + 1}` : `q-${i + 1}`,
      번호: g.문단번호?.length ? g.문단번호.join(', ') : String(i + 1),
      질문: [하위.구분, 하위.질문].filter(Boolean).join(' '),
      원질문: g.질문,
      상위질문: g.상위질문,
      소제목: g.소제목,
      삽화: g.삽화,
      문단번호: g.문단번호,
      문단본문: g.문단본문,
      인용: g.인용,
      참고출판물: g.참고출판물,
      출처URL,
    }, 도구));
  });
}
