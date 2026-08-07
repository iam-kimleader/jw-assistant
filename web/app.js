// 성경 연구 도움 웹앱의 화면 전환과 API 호출을 담당한다.
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
  const lines = [answer.질문, '', answer.답변];
  for (const group of answer.성구 || []) {
    lines.push('', group.라벨);
    for (const verse of group.본문) lines.push(`${verse.주소} ${verse.본문}`);
  }
  return lines.join('\n');
}

function renderAnswer(answer) {
  const node = answerTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector('.answer-number').textContent = answer.문단번호?.length ? `${answer.문단번호.join(', ')}문단` : answer.번호;
  node.querySelector('h3').textContent = answer.질문;
  node.querySelector('.answer-text').textContent = answer.답변;
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
    await navigator.clipboard.writeText(copyText(answer));
    copy.textContent = '완료';
    copy.classList.add('done');
    setTimeout(() => {
      copy.textContent = '복사';
      copy.classList.remove('done');
    }, 1300);
  });
  return node;
}

function renderResult(panel, data) {
  panel.innerHTML = '';
  panel.append(studyHeader(data));
  if (data.answers) {
    for (const answer of data.answers) panel.append(renderAnswer(answer));
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
    for (const answer of section.answers || []) panel.append(renderAnswer(answer));
  }
}

async function loadPrep(kind) {
  const panel = document.querySelector(kind === 'watchtower' ? '#watchtower-result' : '#life-result');
  const select = document.querySelector(kind === 'watchtower' ? '#watchtower-week' : '#life-week');
  const path = kind === 'watchtower' ? '/api/watchtower' : '/api/life-ministry';
  status(panel, '준비하고 있습니다.');
  try {
    const response = await fetch(`${path}?date=${encodeURIComponent(select.value)}`);
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || '요청에 실패했습니다.');
    renderResult(panel, data);
  } catch (error) {
    status(panel, error.message, 'warning');
  }
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
}

init().catch(error => {
  document.body.innerHTML = `<main><div class="status-box warning">${error.message}</div></main>`;
});
