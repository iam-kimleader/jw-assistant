// 「읽가」·「랑제」 과 문서를 요점 객체로 바꾸고 교본 매니페스트를 읽는 모듈
import { readFileSync } from 'node:fs';
import { 요소들, 클래스목록, 텍스트 } from './wol-html.mjs';

const 책이름 = { 읽가: '읽고 가르치는 기술을 발전시키십시오', 랑제: '사람들을 사랑하고 제자로 삼으십시오' };

function 라벨떼기(문장, 라벨) {
  return 문장.replace(new RegExp(`^\\s*${라벨}\\s*:?\\s*`), '').trim();
}

// 책 이름은 <article> 여는 태그의 class 에 있다 (pub-th → 읽가, pub-lmd → 랑제).
function 책찾기(html) {
  const 여는태그 = (html.match(/<article\b[^>]*>/) || [])[0] ?? '';
  const 클래스들 = 클래스목록(여는태그);
  if (클래스들.includes('pub-th')) return '읽가';
  if (클래스들.includes('pub-lmd')) return '랑제';
  return '';
}

export function parseTeachingLesson(html) {
  const 책 = 책찾기(html);
  const blocks = 요소들(html, ['h1', 'h2', 'p']);

  // 과 번호는 <p class="contextTtl"> 문단에 "N과" 로만 담긴다.
  const 과줄 = blocks.find(b => b.태그 === 'p' && 클래스목록(b.속성).includes('contextTtl'))?.텍스트 ?? '';
  const 과 = Number((과줄.match(/^(\d+)과/) || [])[1] ?? 0);

  // <h1> 은 제목만 담는다. 「N과」 접두는 없다.
  const 제목 = (blocks.find(b => b.태그 === 'h1')?.텍스트 ?? '').trim();

  const 요점줄 = blocks.find(b => b.태그 === 'p' && /^이 과의 요점/.test(b.텍스트));
  const 원칙줄 = blocks.find(b => b.태그 === 'p' && /^원칙/.test(b.텍스트));

  return {
    책,
    과,
    제목,
    요점: 요점줄 ? 라벨떼기(요점줄.텍스트, '이 과의 요점') : '',
    원칙: 원칙줄 ? 라벨떼기(원칙줄.텍스트, '원칙') : '',
  };
}

export function loadTeachingLessons(경로) {
  return JSON.parse(readFileSync(경로, 'utf8'));
}

export function 찾기(매니페스트, 책, 과) {
  return (매니페스트?.[책]?.과 ?? []).find(x => x.번호 === Number(과)) ?? null;
}

export { 책이름, 텍스트 };
