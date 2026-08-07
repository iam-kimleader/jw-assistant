// 웹 API에서 쓰는 준비 자료 조립 서비스
import { join } from 'node:path';
import { loadIndex } from './verse-address.mjs';
import { createTextReader } from './bible-text.mjs';
import { loadRefs } from './refs-lookup.mjs';
import { articleUrl, isoWeek, weekPageUrl, parseWeekPage } from './wol-week.mjs';
import { parseArticle } from './wol-article.mjs';
import { fetchCached } from './wol-fetch.mjs';
import { buildArticleAnswers, buildAnswerDraft } from './prep-answer.mjs';
import { enhanceAnswersWithAI } from './ai-answer.mjs';
import { findPublicationChapter, parseMinistryMeeting, readingRangeNote } from './ministry-meeting.mjs';

export function createTools(root = process.cwd()) {
  const index = loadIndex(join(root, 'core/bible/index.json'));
  return {
    index,
    text: createTextReader(index, join(root, 'core/bible/text')),
    refs: loadRefs(index, join(root, 'core/bible/refs')),
  };
}

function 날짜객체(dateText) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText ?? '')) throw new Error('날짜 형식은 YYYY-MM-DD 여야 한다');
  const d = new Date(`${dateText}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== dateText) throw new Error(`날짜가 올바르지 않다: ${dateText}`);
  return d;
}

async function weekDocuments(dateText) {
  const date = 날짜객체(dateText);
  const { year, week } = isoWeek(date);
  const 주페이지URL = weekPageUrl(year, week);
  const 주html = await fetchCached(주페이지URL, `week-${year}-${week}.html`);
  return { year, week, 주페이지URL, ...parseWeekPage(주html) };
}

export async function prepareWatchtower(dateText, root = process.cwd()) {
  const 도구 = createTools(root);
  const week = await weekDocuments(dateText);
  const 기사URL = articleUrl(week.파수대docId);
  const html = await fetchCached(기사URL, `doc-${week.파수대docId}.html`);
  const 기사 = parseArticle(html);
  const 생성결과 = await enhanceAnswersWithAI(buildArticleAnswers(기사, 도구, 기사URL), {
    title: 기사.제목,
    sourceUrl: 기사URL,
  });
  return {
    type: 'watchtower',
    title: 기사.제목,
    subtitle: 기사.주라벨,
    sourceUrl: 기사URL,
    weekUrl: week.주페이지URL,
    answers: 생성결과.answers,
    generation: 생성결과.generation,
  };
}

async function resolveCongregationStudy(meeting, 도구) {
  if (!meeting.회중성서연구?.심벌 || !meeting.회중성서연구?.장) {
    return {
      title: meeting.회중성서연구?.제목 ?? '회중 성서 연구',
      sourceUrl: null,
      answers: [],
      warning: '회중 성서 연구 서책을 자동으로 찾지 못했다.',
    };
  }
  const indexUrl = `https://wol.jw.org/ko/wol/publication/r8/lp-ko/${meeting.회중성서연구.심벌}`;
  const indexHtml = await fetchCached(indexUrl, `pub-${meeting.회중성서연구.심벌}.html`);
  const sourceUrl = findPublicationChapter(indexHtml, meeting.회중성서연구.장);
  if (!sourceUrl) {
    return {
      title: meeting.회중성서연구.제목,
      sourceUrl: null,
      answers: [],
      warning: '회중 성서 연구 장 링크를 찾지 못했다.',
    };
  }
  const docId = sourceUrl.split('/').pop();
  const html = await fetchCached(sourceUrl, `doc-${docId}.html`);
  const 기사 = parseArticle(html);
  return {
    title: `${meeting.회중성서연구.제목} — ${기사.제목}`,
    sourceUrl,
    answers: buildArticleAnswers(기사, 도구, sourceUrl),
  };
}

export async function prepareLifeAndMinistry(dateText, root = process.cwd()) {
  const 도구 = createTools(root);
  const week = await weekDocuments(dateText);
  if (!week.교재docId) throw new Error('주간 집회 페이지에서 생활과 봉사 교재를 찾을 수 없다');
  const 교재URL = articleUrl(week.교재docId);
  const html = await fetchCached(교재URL, `doc-${week.교재docId}.html`);
  const meeting = parseMinistryMeeting(html);
  const gems = meeting.영적보물질문.map(q => {
    const draft = buildAnswerDraft({ ...q, 출처URL: 교재URL }, 도구);
    if (!draft.핵심문장.length && !draft.성구.length && meeting.성경범위) {
      draft.답변 = `${readingRangeNote(meeting.성경범위)} 출판물 근거 미확인 — 내 정리임.`;
    }
    return draft;
  });
  const study = await resolveCongregationStudy(meeting, 도구);
  const 생성결과 = await enhanceAnswersWithAI([...gems, ...study.answers], {
    title: `생활과 봉사 — ${meeting.주라벨}`,
    sourceUrl: [교재URL, study.sourceUrl].filter(Boolean).join(', '),
  });
  const 생성답변 = new Map(생성결과.answers.map(answer => [answer.id, answer]));
  return {
    type: 'life-ministry',
    title: `생활과 봉사 — ${meeting.주라벨}`,
    subtitle: meeting.성경범위,
    sourceUrl: 교재URL,
    weekUrl: week.주페이지URL,
    generation: 생성결과.generation,
    sections: [
      { id: 'spiritual-gems', title: '영적 보물 찾기', answers: gems.map(answer => 생성답변.get(answer.id) ?? answer) },
      { id: 'congregation-study', title: '회중 성서 연구', sourceUrl: study.sourceUrl, warning: study.warning, answers: study.answers.map(answer => 생성답변.get(answer.id) ?? answer) },
    ],
  };
}
