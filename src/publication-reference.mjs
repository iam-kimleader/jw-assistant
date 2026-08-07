// 질문에 연결된 WOL 참고 출판물을 읽어 AI용 근거 본문과 공개 링크를 구성한다.
import { fetchCached, resolveRedirect } from './wol-fetch.mjs';
import { 요소들, 속성값, 파라넘, 텍스트 } from './wol-html.mjs';

const 최대본문길이 = 12_000;
const 불용어 = new Set(['어떻게', '무엇', '무엇을', '있습니까', '했습니까', '합니까', '하는', '것은', '것의', '대해', '통해']);

function 서울날짜() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
}

function 숨은값(html, id) {
  for (const match of html.matchAll(/<input\b([^>]*)>/g)) {
    if (속성값(match[1], 'id') === id) return 텍스트(속성값(match[1], 'value') ?? '');
  }
  return '';
}

function 숫자(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

function 검색어(text) {
  return [...new Set(String(text)
    .replace(/「[^」]+」/g, ' ')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(word => word.length >= 2 && !불용어.has(word)))];
}

function 항범위(label) {
  const 번호들 = [];
  const normalized = String(label).replace(/[–—~]/g, '-');
  for (const match of normalized.matchAll(/(\d+)\s*(?:-\s*(?:\d+\s*면\s*)?(\d+))?\s*항/g)) {
    번호들.push(Number(match[1]));
    if (match[2]) 번호들.push(Number(match[2]));
  }
  if (!번호들.length) return null;
  return { 시작: Math.min(...번호들), 끝: Math.max(...번호들) };
}

function 관련문단(문단들, 질문) {
  const terms = 검색어(질문);
  const scored = 문단들.map((문단, index) => ({
    문단,
    index,
    점수: terms.filter(term => 문단.텍스트.includes(term)).length,
  }));
  const positive = scored.filter(item => item.점수 > 0);
  const selected = (positive.length ? positive : scored)
    .sort((a, b) => b.점수 - a.점수 || a.index - b.index)
    .slice(0, 6)
    .sort((a, b) => a.index - b.index)
    .map(item => item.문단);
  return selected;
}

function 링크본문(document, selected) {
  const 본문 = selected.map(문단 => 문단.텍스트).join('\n').slice(0, 최대본문길이);
  const anchor = selected.find(문단 => 문단.id)?.id;
  return {
    본문,
    url: anchor ? `${document.url}#${anchor}` : document.url,
  };
}

export function parsePublicationDocument(html) {
  const articleMatch = String(html).match(/<article\b([^>]*)>([\s\S]*?)<\/article>/);
  if (!articleMatch) throw new Error('참고 출판물의 기사 본문을 찾지 못했다.');

  const articleAttributes = articleMatch[1];
  const articleBody = articleMatch[2];
  const docId = articleAttributes.match(/\bdocId-(\d+)\b/)?.[1] ?? 숨은값(articleBody, 'docId');
  if (!docId) throw new Error('참고 출판물의 문서 ID를 찾지 못했다.');

  const boxStart = articleBody.search(/<div\b(?=[^>]*class="[^"]*\bboxSupplement\b)[^>]*>/);
  const boxEnd = boxStart >= 0 ? articleBody.indexOf('</aside>', boxStart) : -1;
  const 문단들 = 요소들(articleBody, ['p'])
    .map(element => {
      const classes = (속성값(element.속성, 'class') ?? '').split(/\s+/);
      const id = 속성값(element.속성, 'id') ?? '';
      return {
        id,
        pid: 숫자(속성값(element.속성, 'data-pid') ?? id.replace(/^p/, '')),
        번호: 숫자(파라넘(element.본문)),
        텍스트: element.텍스트,
        질문: classes.includes('qu'),
        상자: boxStart >= 0 && element.index >= boxStart && (boxEnd < 0 || element.index < boxEnd),
      };
    })
    .filter(문단 => 문단.텍스트 && !문단.질문);

  const 첫항 = 문단들.find(문단 => /^1\.\s*/.test(문단.텍스트));
  const 추정오프셋 = 첫항?.pid ? 첫항.pid - 1 : /\bpub-w\b/.test(articleAttributes) ? 1 : null;
  for (const 문단 of 문단들) {
    if (문단.번호 === null && 추정오프셋 !== null && 문단.pid && 문단.pid > 추정오프셋) {
      문단.추정번호 = 문단.pid - 추정오프셋;
    }
  }

  const 제목 = 숨은값(articleBody, 'contentTitle')
    || 요소들(articleBody, ['h1']).find(element => element.텍스트)?.텍스트
    || '참고 출판물';
  return {
    제목,
    출판물: 숨은값(articleBody, 'parentTitle'),
    url: `https://wol.jw.org/ko/wol/d/r8/lp-ko/${docId}`,
    문단들,
  };
}

export function selectPublicationContent(document, label, question, resolvedUrl = '') {
  let selected = [];
  const exactRange = String(resolvedUrl).match(/#h=(\d+):\d+-(\d+):\d+/);
  if (exactRange) {
    const start = Number(exactRange[1]);
    const end = Number(exactRange[2]);
    selected = document.문단들.filter(문단 => 문단.pid !== null && 문단.pid >= start && 문단.pid < end);
  }
  if (!selected.length && /네모/.test(label)) selected = document.문단들.filter(문단 => 문단.상자);

  const range = 항범위(label);
  if (!selected.length && range) {
    const 명시항 = document.문단들.filter(문단 =>
      문단.번호 !== null && 문단.번호 >= range.시작 && 문단.번호 <= range.끝);
    selected = 명시항.length ? 명시항 : document.문단들.filter(문단 =>
      문단.추정번호 !== null && 문단.추정번호 !== undefined
      && 문단.추정번호 >= range.시작 && 문단.추정번호 <= range.끝);
  }

  if (!selected.length) selected = 관련문단(document.문단들.filter(문단 => !문단.상자), question);
  const result = 링크본문(document, selected);
  return { ...result, url: resolvedUrl || result.url };
}

function 캐시이름(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean).slice(-3);
  return `reference-${parts.join('-')}.html`;
}

function 공식참고URL(url) {
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'wol.jw.org' || !/\/wol\/pc\//.test(parsed.pathname)) {
    throw new Error('공식 WOL 참고 자료 링크가 아니다.');
  }
  return parsed.href;
}

export async function enrichAnswersWithPublicationReferences(answers, options = {}) {
  const fetchDocument = options.fetchDocument ?? (async url => {
    const resolvedUrl = await resolveRedirect(url);
    const canonical = new URL(resolvedUrl);
    canonical.hash = '';
    const docId = canonical.pathname.split('/').filter(Boolean).pop();
    return {
      html: await fetchCached(canonical.href, `reference-doc-${docId}.html`),
      resolvedUrl,
    };
  });
  const accessedAt = options.accessedAt ?? 서울날짜();
  const logger = options.logger ?? console;
  const documents = new Map();
  let fetchQueue = Promise.resolve();

  function load(url) {
    const officialUrl = 공식참고URL(url);
    if (!documents.has(officialUrl)) {
      const task = fetchQueue.then(async () => {
        const fetched = await fetchDocument(officialUrl, 캐시이름(officialUrl));
        const html = typeof fetched === 'string' ? fetched : fetched.html;
        const document = parsePublicationDocument(html);
        return { ...document, resolvedUrl: typeof fetched === 'string' ? '' : fetched.resolvedUrl };
      });
      fetchQueue = task.catch(() => undefined);
      documents.set(officialUrl, task);
    }
    return documents.get(officialUrl);
  }

  return Promise.all(answers.map(async answer => ({
    ...answer,
    참고출판물: await Promise.all((answer.참고출판물 ?? []).map(async reference => {
      try {
        const document = await load(reference.url);
        const selected = selectPublicationContent(
          document,
          reference.표시,
          [answer.상위질문, answer.질문].filter(Boolean).join(' '),
          document.resolvedUrl,
        );
        return {
          표시: reference.표시,
          제목: document.제목,
          출판물: document.출판물,
          url: selected.url,
          원문URL: reference.url,
          조회일: accessedAt,
          본문: selected.본문,
        };
      } catch (error) {
        logger.warn('참고 출판물 조회 실패.', error instanceof Error ? error.message : String(error));
        return { ...reference, 조회일: accessedAt };
      }
    })),
  })));
}

export function stripPublicationContents(answers) {
  return answers.map(answer => ({
    ...answer,
    참고출판물: (answer.참고출판물 ?? []).map(({ 본문, ...reference }) => reference),
  }));
}
