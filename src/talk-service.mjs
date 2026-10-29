// 연설 세 API가 공통으로 부르는 조립 계층
import { fetchCached } from './wol-fetch.mjs';
import { parseTalkAssignments } from './talk-assignments.mjs';
import { parseMinistryMeeting } from './ministry-meeting.mjs';
import { 배정에게이트적용, 자격판정, 기본프로필 } from './talk-profile.mjs';
// 매니페스트를 실행 시점에 경로로 읽으면 Vercel 번들러가 그 파일을 못 보고 빼먹는다.
// 실제로 배포판에서 ENOENT 가 났다. 정적 import 는 번들러가 추적하므로 로컬과 배포판이 같게 돈다.
import 교본매니페스트 from './teaching-lessons.json' with { type: 'json' };
import { 뼈대만들기, 참조링크 } from './talk-outline.mjs';
import { 살채우기 } from './talk-draft.mjs';
import { enrichAnswersWithPublicationReferences } from './publication-reference.mjs';
import { renderTalk } from './talk-render.mjs';
import { 시간보고, 기본설정 } from './talk-timing.mjs';
import { 성구읽기만들기 } from './talk-verses.mjs';
import { weekDocuments } from './prep-service.mjs';
import { articleUrl } from './wol-week.mjs';

// 연설은 연구 답변과 모델을 따로 쓴다. OPENAI_MODEL·OPENAI_REASONING_EFFORT 는 연구 답변 몫이라
// 그것을 따르면 연구 쪽 값을 바꿀 때 연설까지 바뀐다. TALK_MODEL 로 환경마다 맞춘다.
// 원고 강도는 talk-draft.mjs 의 TALK_DRAFT_EFFORT 가 따로 정한다.
export const 연설기본모델 = 'gpt-5.6-sol';
const 연설뼈대강도 = 'high';

export function 환경만들기(루트) {
  return {
    루트,
    매니페스트: 교본매니페스트,
    읽기: 성구읽기만들기(루트),
    설정: {
      apiKey: process.env.OPENAI_API_KEY ?? '',
      model: process.env.TALK_MODEL || 연설기본모델,
      effort: 연설뼈대강도,
    },
  };
}

export async function 배정목록({ 날짜, 프로필 = 기본프로필(), 조회 = fetchCached, 주찾기 = weekDocuments }) {
  const week = await 주찾기(날짜);
  if (!week.교재docId) throw new Error('주간 집회 페이지에서 생활과 봉사 교재를 찾을 수 없다');
  const url = articleUrl(week.교재docId);
  const html = await 조회(url, `doc-${week.교재docId}.html`);
  // parseWeekPage 는 주 라벨을 주지 않는다. 같은 교재 html 을 이미 들고 있으므로
  // parseMinistryMeeting 이 h1 에서 뽑는 주라벨을 재조회 없이 그대로 쓴다.
  const { 주라벨 } = parseMinistryMeeting(html);
  const 전체 = parseTalkAssignments(html);
  const 연설만 = 전체.filter(x => x.종류 !== '연설아님');
  if (!연설만.length) throw new Error(`교재에서 연설 배정을 하나도 찾지 못했다 — ${url}`);

  return {
    주라벨: 주라벨 || 날짜,
    url,
    배정: 배정에게이트적용(프로필, 연설만),
    공개강연카드: {
      번호: 0, 제목: '일요일 공개강연', 절: '공개강연', 종류: '공개강연', 시간초: 1800,
      봉사형태: '', 설명: '개요의 제목과 주제 성구와 소제목을 입력하십시오.',
      지정요점: null, 소제목: [], 묵상: '', 낭독범위: '', 교재원문: '',
      ...자격판정(프로필, '공개강연'),
    },
  };
}

// 배정 하나가 읽는 출판물은 4편까지, 모델에 넘기는 본문은 모두 합쳐 16,000자까지다.
// 문서 하나는 publication-reference.mjs 가 12,000자로 자른다. 여러 기사를 통째로 태우는
// 일이 구조적으로 일어나지 않게 한다(설계 10절).
const 최대참조수 = 4;
const 참조본문상한 = 16_000;

// 연구 답변이 쓰는 모듈을 그대로 쓴다. 공식 WOL `/wol/pc/` 링크만 읽고, 못 읽은 링크도
// 표시와 URL과 조회일은 남긴다. 질문은 항 범위가 없는 링크에서 관련 문단을 고를 때 쓴다.
// 뼈대 요청의 배정도 원고 요청의 뼈대도 브라우저가 보내므로 링크 수를 여기서 자른다.
async function 참조읽기(링크들, 질문, 환경) {
  if (!링크들.length) return [];
  const [답] = await enrichAnswersWithPublicationReferences(
    [{ 질문, 참고출판물: 링크들.slice(0, 최대참조수) }],
    환경.출판물조회 ?? {},
  );
  let 남은 = 참조본문상한;
  return 답.참고출판물.map(x => {
    if (!x.본문) return x;
    const 본문 = x.본문.slice(0, 남은);
    남은 -= 본문.length;
    return { ...x, 본문 };
  });
}

const 참조질문 = 대상 => [대상.제목, 대상.설명].filter(Boolean).join(' ');

export async function 뼈대준비({ 배정, 프로필 = 기본프로필(), 공개강연입력 = null, 준비메모 = null }, 환경) {
  const 참조 = await 참조읽기(참조링크(배정), 참조질문(배정), 환경);
  return 뼈대만들기({ 배정, 프로필, 매니페스트: 환경.매니페스트, 공개강연입력, 준비메모, 참조, 설정: 환경.설정 });
}

export async function 원고준비({ 뼈대, 프로필 = 기본프로필() }, 환경) {
  // 뼈대에는 출판물 본문이 없다(talk-outline.mjs 의 본문뺀참조). 같은 링크로 다시 읽는다.
  // 못 읽었던 참조는 원문URL 이 없고 url 이 곧 `/pc/` 링크다.
  const 링크들 = (뼈대.참조 ?? []).map(x => ({ 표시: x.표시, url: x.원문URL || x.url }));
  const 참조 = await 참조읽기(링크들, 참조질문(뼈대), 환경);
  const { 구조체, 생성 } = await 살채우기({
    뼈대, 프로필, 읽기: 환경.읽기, 참조, 설정: 환경.설정,
  });
  const 설정 = { ...기본설정, 분당글자수: 프로필.분당글자수 ?? 기본설정.분당글자수 };
  return { 구조체, 산출물: renderTalk(구조체, 설정), 시간: 시간보고(구조체, 설정), 생성 };
}
