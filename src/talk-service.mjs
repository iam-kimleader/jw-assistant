// 연설 세 API가 공통으로 부르는 조립 계층
import { fetchCached } from './wol-fetch.mjs';
import { parseTalkAssignments } from './talk-assignments.mjs';
import { parseMinistryMeeting } from './ministry-meeting.mjs';
import { 배정에게이트적용, 자격판정, 기본프로필 } from './talk-profile.mjs';
// 매니페스트를 실행 시점에 경로로 읽으면 Vercel 번들러가 그 파일을 못 보고 빼먹는다.
// 실제로 배포판에서 ENOENT 가 났다. 정적 import 는 번들러가 추적하므로 로컬과 배포판이 같게 돈다.
import 교본매니페스트 from './teaching-lessons.json' with { type: 'json' };
import { 뼈대만들기 } from './talk-outline.mjs';
import { 살채우기 } from './talk-draft.mjs';
import { renderTalk } from './talk-render.mjs';
import { 시간보고, 기본설정 } from './talk-timing.mjs';
import { 성구읽기만들기 } from './talk-verses.mjs';
import { weekDocuments } from './prep-service.mjs';
import { articleUrl } from './wol-week.mjs';

export function 환경만들기(루트) {
  return {
    루트,
    매니페스트: 교본매니페스트,
    읽기: 성구읽기만들기(루트),
    설정: { apiKey: process.env.OPENAI_API_KEY ?? '', model: process.env.OPENAI_MODEL || undefined },
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

export async function 뼈대준비({ 배정, 프로필 = 기본프로필(), 공개강연입력 = null }, 환경) {
  return 뼈대만들기({ 배정, 프로필, 매니페스트: 환경.매니페스트, 공개강연입력, 설정: 환경.설정 });
}

export async function 원고준비({ 뼈대, 프로필 = 기본프로필() }, 환경) {
  const { 구조체, 생성 } = await 살채우기({
    뼈대, 프로필, 읽기: 환경.읽기, 설정: 환경.설정,
  });
  const 설정 = { ...기본설정, 분당글자수: 프로필.분당글자수 ?? 기본설정.분당글자수 };
  return { 구조체, 산출물: renderTalk(구조체, 설정), 시간: 시간보고(구조체, 설정), 생성 };
}
