// 성경 연구 도움 웹앱의 화면 전환과 API 호출을 담당한다.
import { estimatePreparationProgress } from '/progress.js';

const state = {
  currentView: 'home',
  weeks: [],
};

const views = new Map(Array.from(document.querySelectorAll('.view')).map(el => [el.id, el]));
const navButtons = Array.from(document.querySelectorAll('[data-view]'));
const answerTemplate = document.querySelector('#answer-template');

function setView(name) {
  state.currentView = name;
  for (const [id, el] of views) el.classList.toggle('active', id === name);
  for (const button of document.querySelectorAll('.nav-button')) {
    button.classList.toggle('active', button.dataset.view === name || (name === 'home' && button.dataset.view === 'home'));
  }
}

function fillWeeks(select) {
  select.replaceChildren(...state.weeks.map(week => {
    const option = document.createElement('option');
    option.value = week.value;
    option.textContent = week.current ? `${week.label} 현재 주` : week.label;
    option.selected = week.current;
    return option;
  }));
}

function status(panel, text, kind = '') {
  panel.innerHTML = '';
  const box = document.createElement('div');
  box.className = `status-box ${kind}`;
  box.textContent = text;
  panel.append(box);
}

function preparationProgress(panel) {
  panel.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'status-box progress-status';
  box.setAttribute('role', 'status');
  box.setAttribute('aria-live', 'polite');

  const text = document.createElement('div');
  text.className = 'progress-copy';
  const title = document.createElement('strong');
  title.textContent = '답변을 준비하고 있습니다.';
  const detail = document.createElement('span');
  detail.textContent = '예상 진행률';
  text.append(title, detail);

  const gauge = document.createElement('div');
  gauge.className = 'progress-gauge';
  gauge.setAttribute('role', 'progressbar');
  gauge.setAttribute('aria-label', '답변 준비 예상 진행률');
  gauge.setAttribute('aria-valuemin', '0');
  gauge.setAttribute('aria-valuemax', '100');
  const value = document.createElement('span');
  value.className = 'progress-value';
  gauge.append(value);
  box.append(text, gauge);
  panel.append(box);

  const startedAt = Date.now();
  function update(progress) {
    const percent = Math.max(0, Math.min(100, Math.round(progress)));
    gauge.style.setProperty('--progress-angle', `${percent * 3.6}deg`);
    gauge.setAttribute('aria-valuenow', String(percent));
    gauge.setAttribute('aria-valuetext', `예상 진행률 ${percent}퍼센트`);
    value.textContent = `${percent}%`;
  }
  update(estimatePreparationProgress(0));
  const timer = setInterval(() => update(estimatePreparationProgress(Date.now() - startedAt)), 1_000);

  return {
    complete() {
      clearInterval(timer);
      update(100);
    },
    stop() {
      clearInterval(timer);
    },
  };
}

function studyHeader(data) {
  const header = document.createElement('div');
  header.className = 'study-header';
  const h2 = document.createElement('h2');
  h2.textContent = data.title;
  const p = document.createElement('p');
  p.textContent = data.subtitle || data.sourceUrl || '';
  header.append(h2, p);
  return header;
}

function copyText(answer) {
  return answer.답변;
}

async function writeClipboard(text) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 권한이 제한된 브라우저에서는 아래의 선택 영역 복사 방식으로 이어 간다.
    }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}

function renderAnswer(answer) {
  const node = answerTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.answer-number').textContent = answer.문단번호?.length ? `${answer.문단번호.join(', ')}문단` : answer.번호;
  node.querySelector('h3').textContent = answer.질문;
  node.querySelector('.answer-text').textContent = answer.답변;
  const references = node.querySelector('.publication-references');
  if (answer.참고출판물?.length) {
    const heading = document.createElement('strong');
    heading.className = 'publication-references-title';
    heading.textContent = '참고 출판물';
    references.append(heading);
  }
  for (const reference of answer.참고출판물 || []) {
    const item = document.createElement('div');
    item.className = 'publication-reference';
    const link = document.createElement('a');
    link.href = reference.url || reference.원문URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = reference.표시 || reference.제목 || 'WOL 참고 자료';
    item.append(link);
    const detailText = [reference.제목, reference.출판물].filter(Boolean).join(' · ');
    if (detailText) {
      const detail = document.createElement('span');
      detail.textContent = detailText;
      item.append(detail);
    }
    references.append(item);
  }
  const scriptures = node.querySelector('.scriptures');
  for (const group of answer.성구 || []) {
    const box = document.createElement('div');
    box.className = 'scripture';
    const title = document.createElement('strong');
    title.textContent = group.낭독 ? `${group.라벨} 낭독` : group.라벨;
    box.append(title);
    for (const verse of group.본문) {
      const p = document.createElement('p');
      p.textContent = `${verse.주소} ${verse.본문}`;
      box.append(p);
    }
    scriptures.append(box);
  }
  const copy = node.querySelector('.copy-button');
  copy.addEventListener('click', async () => {
    await writeClipboard(copyText(answer));
    copy.textContent = '복사 완료';
    copy.classList.add('done');
    setTimeout(() => {
      copy.textContent = '답변 복사';
      copy.classList.remove('done');
    }, 1300);
  });
  return node;
}

function renderAnswers(panel, answers) {
  let 이전소제목 = '';
  let 이전상위질문 = '';
  for (const answer of answers) {
    if (answer.소제목 && answer.소제목 !== 이전소제목) {
      const heading = document.createElement('h3');
      heading.className = 'study-subheading';
      heading.textContent = answer.소제목;
      panel.append(heading);
      이전소제목 = answer.소제목;
      이전상위질문 = '';
    }
    if (answer.상위질문 && answer.상위질문 !== 이전상위질문) {
      const context = document.createElement('p');
      context.className = 'parent-question';
      context.textContent = answer.상위질문;
      panel.append(context);
      이전상위질문 = answer.상위질문;
    } else if (!answer.상위질문) {
      이전상위질문 = '';
    }
    panel.append(renderAnswer(answer));
  }
}

function renderResult(panel, data) {
  panel.innerHTML = '';
  panel.append(studyHeader(data));
  if (data.generation?.warning) {
    const warning = document.createElement('div');
    warning.className = 'status-box warning generation-warning';
    warning.textContent = data.generation.warning;
    panel.append(warning);
  }
  if (data.answers) {
    renderAnswers(panel, data.answers);
    return;
  }
  for (const section of data.sections || []) {
    const title = document.createElement('h2');
    title.className = 'section-title';
    title.textContent = section.title;
    panel.append(title);
    if (section.warning) {
      const warning = document.createElement('div');
      warning.className = 'status-box warning';
      warning.textContent = section.warning;
      panel.append(warning);
    }
    renderAnswers(panel, section.answers || []);
  }
}

async function loadPrep(kind) {
  const panel = document.querySelector(kind === 'watchtower' ? '#watchtower-result' : '#life-result');
  const select = document.querySelector(kind === 'watchtower' ? '#watchtower-week' : '#life-week');
  const button = document.querySelector(kind === 'watchtower' ? '#watchtower-load' : '#life-load');
  const path = kind === 'watchtower' ? '/api/watchtower' : '/api/life-ministry';
  const progress = preparationProgress(panel);
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch(`${path}?date=${encodeURIComponent(select.value)}`);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '요청에 실패했습니다.');
    progress.complete();
    await new Promise(resolve => setTimeout(resolve, 300));
    renderResult(panel, data);
  } catch (error) {
    progress.stop();
    status(panel, error.message, 'warning');
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

// ---- 연설 화면 ----

const 프로필키 = 'jw-assistant-talk-profile';
// 과제 4의 기본프로필() 과 같은 값이다. 브라우저 코드는 서버 모듈을 import 하지 못하므로 여기에 다시 적는다.
const 기본프로필값 = { 성별: '형제', 연령: 35, 임명: '미임명', 파이오니아: false, 스타일: '논리형', 문체견본: '', 분당글자수: 320 };
const 스타일목록 = ['논리형', '설득형', '이야기형', '따뜻한 격려형', '질문형'];
const 임명목록 = ['장로', '봉사의 종', '미임명'];

const talkState = {
  프로필: 기본프로필값,
  배정목록: [],
  공개강연카드: null,
  선택배정: null,
  뼈대: null,
  뼈대생성: null,
  구조체: null,
  산출물: null,
  시간: null,
  초안생성: null,
  탭: '준비원고',
};

function 프로필읽기() {
  try {
    return { ...기본프로필값, ...JSON.parse(localStorage.getItem(프로필키) ?? '{}') };
  } catch {
    return { ...기본프로필값 };
  }
}

function 프로필쓰기(프로필) {
  localStorage.setItem(프로필키, JSON.stringify(프로필));
}

function 내려받기(이름, 본문) {
  const blob = new Blob([본문], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 이름;
  a.click();
  URL.revokeObjectURL(a.href);
}

function 파일이름(날짜, 제목, 산출물) {
  const 안전한제목 = String(제목).replace(/[\\/:*?"<>|]/g, '').slice(0, 40);
  return `${날짜}-${안전한제목}-${산출물}.md`;
}

function 분초표시(초) {
  const 값 = Math.max(0, Math.round(초 || 0));
  return `${Math.floor(값 / 60)}분 ${값 % 60}초`;
}

// src/talk-outline.mjs 의 공개강연입력검증(입력) 과 같은 규칙이다.
// 브라우저는 서버 모듈을 import 하지 못하므로 같은 규칙을 여기 다시 적는다. 서버 검증은 그대로 둔다.
function 공개강연입력검증(입력) {
  const 위반 = [];
  if (!String(입력?.제목 ?? '').trim()) 위반.push('제목이 비어 있습니다.');
  const 소제목 = (입력?.소제목 ?? []).filter(x => String(x?.문장 ?? '').trim());
  if (소제목.length < 2) 위반.push('소제목이 둘 이상 필요합니다.');
  if ((입력?.소제목 ?? []).length !== 소제목.length) 위반.push('빈 소제목 칸이 있습니다.');
  return { 통과: 위반.length === 0, 위반 };
}

function fillTalkOptionLists() {
  document.querySelector('#talk-role').replaceChildren(...임명목록.map(v => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    return option;
  }));
  document.querySelector('#talk-style').replaceChildren(...스타일목록.map(v => {
    const option = document.createElement('option');
    option.value = v;
    option.textContent = v;
    return option;
  }));
}

function applyProfileToForm(프로필) {
  document.querySelector('#talk-gender').value = 프로필.성별;
  document.querySelector('#talk-age').value = 프로필.연령;
  document.querySelector('#talk-role').value = 프로필.임명;
  document.querySelector('#talk-pioneer').checked = 프로필.파이오니아;
  document.querySelector('#talk-style').value = 프로필.스타일;
  document.querySelector('#talk-cpm').value = 프로필.분당글자수;
  document.querySelector('#talk-sample').value = 프로필.문체견본;
}

function readProfileFromForm() {
  return {
    성별: document.querySelector('#talk-gender').value,
    연령: Number(document.querySelector('#talk-age').value) || 기본프로필값.연령,
    임명: document.querySelector('#talk-role').value,
    파이오니아: document.querySelector('#talk-pioneer').checked,
    스타일: document.querySelector('#talk-style').value,
    분당글자수: Number(document.querySelector('#talk-cpm').value) || 기본프로필값.분당글자수,
    문체견본: document.querySelector('#talk-sample').value,
  };
}

function showTalkError(selector, message) {
  const box = document.querySelector(selector);
  box.hidden = !message;
  box.textContent = message || '';
}

function resetTalkOutput() {
  document.querySelector('#talk-outline-area').hidden = true;
  document.querySelector('#talk-output').hidden = true;
  document.querySelector('#talk-build-outline').disabled = true;
  showTalkError('#talk-error', '');
  showTalkError('#talk-draft-error', '');
}

function renderTalkAssignments() {
  const grid = document.querySelector('#talk-assignments');
  grid.innerHTML = '';
  const cards = [...talkState.배정목록, talkState.공개강연카드].filter(Boolean);
  for (const 배정 of cards) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'service-card' + (배정.가능 ? ' active-card' : '');
    button.disabled = !배정.가능;
    if (talkState.선택배정 === 배정) button.classList.add('selected');

    const kicker = document.createElement('span');
    kicker.className = 'service-kicker';
    kicker.textContent = 배정.절;
    const title = document.createElement('strong');
    title.textContent = 배정.제목;
    const desc = document.createElement('span');
    desc.textContent = 배정.설명 || 배정.봉사형태 || `${분초표시(배정.시간초)} 배정`;
    button.append(kicker, title, desc);

    if (!배정.가능 && 배정.사유) {
      const reason = document.createElement('span');
      reason.className = 'card-reason';
      reason.textContent = 배정.사유;
      button.append(reason);
    }
    if (배정.가능) {
      button.addEventListener('click', () => selectTalkAssignment(배정));
    }
    grid.append(button);
  }
}

function selectTalkAssignment(배정) {
  talkState.선택배정 = 배정;
  talkState.뼈대 = null;
  resetTalkOutput();
  renderTalkAssignments();
  const publicForm = document.querySelector('#talk-public');
  if (배정.종류 === '공개강연') {
    publicForm.hidden = false;
    validatePublicTalkForm();
  } else {
    publicForm.hidden = true;
    document.querySelector('#talk-build-outline').disabled = false;
  }
}

function addPublicPoint() {
  const container = document.querySelector('#talk-public-points');
  const label = document.createElement('label');
  label.textContent = '소제목';
  const input = document.createElement('input');
  input.className = 'talk-public-point';
  input.addEventListener('input', validatePublicTalkForm);
  label.append(input);
  container.append(label);
}

function readPublicTalkInput() {
  const 소제목 = Array.from(document.querySelectorAll('.talk-public-point')).map(input => ({ 문장: input.value }));
  return {
    제목: document.querySelector('#talk-public-title').value,
    주제성구: document.querySelector('#talk-public-verse').value,
    배정시간: (Number(document.querySelector('#talk-public-minutes').value) || 30) * 60,
    소제목,
  };
}

function validatePublicTalkForm() {
  const 입력 = readPublicTalkInput();
  const { 통과, 위반 } = 공개강연입력검증(입력);

  document.querySelector('#talk-public-title').classList.toggle('field-invalid', !String(입력.제목 ?? '').trim());
  for (const input of document.querySelectorAll('.talk-public-point')) {
    input.classList.toggle('field-invalid', !input.value.trim());
  }

  const errorBox = document.querySelector('#talk-public-error');
  errorBox.hidden = 통과;
  errorBox.textContent = 통과 ? '' : 위반.join(' ');
  document.querySelector('#talk-build-outline').disabled = !통과;
  return { 통과, 입력 };
}

async function loadTalkAssignments() {
  const select = document.querySelector('#talk-week');
  if (!select.value) return;
  talkState.프로필 = readProfileFromForm();
  프로필쓰기(talkState.프로필);
  talkState.선택배정 = null;
  document.querySelector('#talk-public').hidden = true;
  resetTalkOutput();

  const grid = document.querySelector('#talk-assignments');
  status(grid, '배정을 불러오는 중입니다.');
  try {
    const url = `/api/talk-assignments?date=${encodeURIComponent(select.value)}&profile=${encodeURIComponent(JSON.stringify(talkState.프로필))}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '배정을 불러오지 못했습니다.');
    talkState.배정목록 = data.배정;
    talkState.공개강연카드 = data.공개강연카드;
    renderTalkAssignments();
  } catch (error) {
    status(grid, error.message, 'warning');
  }
}

function renderTalkOutlineTable() {
  const tbody = document.querySelector('#talk-outline tbody');
  tbody.innerHTML = '';
  talkState.뼈대.구간.forEach((구간, i) => {
    const tr = document.createElement('tr');
    const nameTd = document.createElement('td');
    nameTd.textContent = 구간.이름;

    const startInput = document.createElement('input');
    startInput.type = 'number';
    startInput.min = '0';
    startInput.value = 구간.시작초;
    startInput.addEventListener('change', () => {
      talkState.뼈대.구간[i].시작초 = Number(startInput.value) || 0;
      updateTalkOutlineTime();
    });
    const startTd = document.createElement('td');
    startTd.append(startInput);

    const endInput = document.createElement('input');
    endInput.type = 'number';
    endInput.min = '0';
    endInput.value = 구간.끝초;
    endInput.addEventListener('change', () => {
      talkState.뼈대.구간[i].끝초 = Number(endInput.value) || 0;
      updateTalkOutlineTime();
    });
    const endTd = document.createElement('td');
    endTd.append(endInput);

    const purposeTd = document.createElement('td');
    purposeTd.textContent = 구간.목적;

    tr.append(nameTd, startTd, endTd, purposeTd);
    tbody.append(tr);
  });
  updateTalkOutlineTime();
}

function updateTalkOutlineTime() {
  const 구간 = talkState.뼈대?.구간 ?? [];
  const 합계 = 구간.length ? Math.max(...구간.map(x => x.끝초)) : 0;
  document.querySelector('#talk-outline-time').textContent =
    `배정 ${분초표시(talkState.뼈대.배정시간)} · 현재 구간 합계 ${분초표시(합계)}`;
}

async function buildTalkOutline() {
  const button = document.querySelector('#talk-build-outline');
  showTalkError('#talk-error', '');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const body = { 배정: talkState.선택배정, 프로필: talkState.프로필 };
    if (talkState.선택배정.종류 === '공개강연') {
      const { 통과, 입력 } = validatePublicTalkForm();
      if (!통과) throw new Error('공개강연 입력을 먼저 채우십시오.');
      body.공개강연입력 = 입력;
    }
    const response = await fetch('/api/talk-outline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '뼈대 생성에 실패했습니다.');
    talkState.뼈대 = data.뼈대;
    talkState.뼈대생성 = data.생성;
    document.querySelector('#talk-outline-area').hidden = false;
    document.querySelector('#talk-output').hidden = true;
    showTalkError('#talk-outline-warning', data.생성?.warning);
    renderTalkOutlineTable();
  } catch (error) {
    showTalkError('#talk-error', error.message);
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function renderTalkOutput() {
  document.querySelector('#talk-output').hidden = false;

  const 경고 = [...(talkState.구조체.경고 ?? [])];
  if (talkState.초안생성?.warning) 경고.push(talkState.초안생성.warning);
  showTalkError('#talk-warnings', 경고.join(' '));

  const 시간 = talkState.시간;
  const timeBox = document.querySelector('#talk-time-summary');
  timeBox.hidden = false;
  if (시간.초과 > 0) {
    const 축약문 = (시간.축약적용 ?? []).map(x => `${x.순위}단계 축약 시 ${분초표시(x.총초)}`).join(', ');
    timeBox.className = 'status-box warning';
    timeBox.textContent = `예상 ${분초표시(시간.총초)}로 배정(${분초표시(시간.배정초)})보다 ${분초표시(시간.초과)} 초과입니다.${축약문 ? ` ${축약문}.` : ''}`;
  } else {
    timeBox.className = 'status-box';
    timeBox.textContent = `예상 ${분초표시(시간.총초)} · 배정 ${분초표시(시간.배정초)}.`;
  }

  for (const button of document.querySelectorAll('#talk-output .tab-button')) {
    button.classList.toggle('active', button.dataset.tab === talkState.탭);
  }
  document.querySelector('#talk-text').textContent = talkState.산출물[talkState.탭] || '';
}

async function buildTalkDraft() {
  const button = document.querySelector('#talk-build-draft');
  showTalkError('#talk-draft-error', '');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
    const response = await fetch('/api/talk-draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 뼈대: talkState.뼈대, 프로필: talkState.프로필 }),
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '원고 생성에 실패했습니다.');
    talkState.구조체 = data.구조체;
    talkState.산출물 = data.산출물;
    talkState.시간 = data.시간;
    talkState.초안생성 = data.생성;
    talkState.탭 = '준비원고';
    renderTalkOutput();
  } catch (error) {
    showTalkError('#talk-draft-error', error.message);
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

function initTalk() {
  fillTalkOptionLists();
  talkState.프로필 = 프로필읽기();
  applyProfileToForm(talkState.프로필);
  fillWeeks(document.querySelector('#talk-week'));
  status(document.querySelector('#talk-assignments'), '주간을 선택하세요.');
  addPublicPoint();
  addPublicPoint();

  document.querySelector('#talk-week').addEventListener('change', loadTalkAssignments);
  for (const id of ['#talk-gender', '#talk-age', '#talk-role', '#talk-pioneer', '#talk-style', '#talk-cpm', '#talk-sample']) {
    document.querySelector(id).addEventListener('change', loadTalkAssignments);
  }

  document.querySelector('#talk-public-add').addEventListener('click', () => {
    addPublicPoint();
    validatePublicTalkForm();
  });
  document.querySelector('#talk-public-title').addEventListener('input', validatePublicTalkForm);
  document.querySelector('#talk-public-verse').addEventListener('input', validatePublicTalkForm);
  document.querySelector('#talk-public-minutes').addEventListener('input', validatePublicTalkForm);

  document.querySelector('#talk-build-outline').addEventListener('click', buildTalkOutline);
  document.querySelector('#talk-build-draft').addEventListener('click', buildTalkDraft);

  for (const button of document.querySelectorAll('#talk-output .tab-button')) {
    button.addEventListener('click', () => {
      talkState.탭 = button.dataset.tab;
      renderTalkOutput();
    });
  }

  document.querySelector('#talk-copy').addEventListener('click', async event => {
    await writeClipboard(talkState.산출물?.[talkState.탭] || '');
    const button = event.currentTarget;
    button.textContent = '복사 완료';
    button.classList.add('done');
    setTimeout(() => {
      button.textContent = '복사';
      button.classList.remove('done');
    }, 1300);
  });

  document.querySelector('#talk-download').addEventListener('click', () => {
    const 날짜 = document.querySelector('#talk-week').value;
    const 제목 = talkState.선택배정?.제목 || '연설';
    내려받기(파일이름(날짜, 제목, talkState.탭), talkState.산출물?.[talkState.탭] || '');
  });
}

async function init() {
  for (const button of navButtons) {
    if (button.disabled) continue;
    button.addEventListener('click', () => setView(button.dataset.view));
  }
  const options = await fetch('/api/options').then(r => r.json());
  state.weeks = options.weeks;
  fillWeeks(document.querySelector('#life-week'));
  fillWeeks(document.querySelector('#watchtower-week'));
  document.querySelector('#life-load').addEventListener('click', () => loadPrep('life-ministry'));
  document.querySelector('#watchtower-load').addEventListener('click', () => loadPrep('watchtower'));
  status(document.querySelector('#life-result'), '주간을 선택한 뒤 준비를 누르세요.');
  status(document.querySelector('#watchtower-result'), '주간을 선택한 뒤 준비를 누르세요.');
  initTalk();
}

init().catch(error => {
  document.body.innerHTML = `<main><div class="status-box warning">${error.message}</div></main>`;
});
