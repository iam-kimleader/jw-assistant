// 그 주 「생활과 봉사」 교재에서 연설 배정 항목을 뽑는 모듈
import { 요소들, 링크들, 텍스트 } from './wol-html.mjs';

const 절이름 = [
  { 정규식: /성경에 담긴 보물/, 값: '보물' },
  { 정규식: /야외 봉사/, 값: '야외봉사' },
  { 정규식: /그리스도인 생활/, 값: '생활' },
];

const 연설아님 = /영적 보물 찾기|회중 성서 연구|노래|맺음말|여는 말/;

function 절판정(제목) {
  return 절이름.find(x => x.정규식.test(제목))?.값 ?? null;
}

function 분초(문장) {
  const m = 문장.match(/^\s*\((\d+)분\)/);
  return m ? Number(m[1]) * 60 : 0;
}

function 요점읽기(본문) {
  const m = 텍스트(본문).match(/「(읽가|랑제)」\s*(\d+)과(?:\s*요점\s*(\d+))?/);
  if (!m) return null;
  return { 책: m[1], 과: Number(m[2]), 요점: m[3] ? Number(m[3]) : null };
}

function 참조가르기(본문) {
  const 성구 = [];
  const 출판물 = [];
  for (const 링크 of 링크들(본문)) {
    const 표시 = 링크.텍스트.trim().replace(/[;,]\s*$/, '');
    if (!표시) continue;
    if (링크.href.includes('/bc/')) 성구.push(표시);
    else if (링크.href.includes('/pc/')) 출판물.push({ 표시, pc: 링크.href });
  }
  return { 성구, 출판물 };
}

function 괄호떼기(문장) {
  return 문장.replace(/\s*\([^()]*\)\s*$/, '').trim();
}

function 종류판정(절, 제목, 첫문장) {
  if (연설아님.test(제목)) return '연설아님';
  // 성경 낭독은 「성경에 담긴 보물」 절 안에 있으므로 절 검사보다 먼저 가른다.
  if (/성경 낭독/.test(제목)) return '성경낭독';
  if (절 === '보물') return '보물연설';
  if (절 === '생활') return '생활부분';
  if (/^연설$/.test(제목.trim())) return '학생연설';
  return /토의|연설/.test(첫문장) ? '학생연설' : '시연';
}

function 봉사형태읽기(설명) {
  const m = 설명.match(/^(호별 방문|공개 증거|비공식 증거|전화 증거|재방문)\s*\./);
  return m ? m[1] : '';
}

export function parseTalkAssignments(html) {
  const blocks = 요소들(html, ['h2', 'h3', 'p', 'li']);
  const 항목들 = [];
  let 절 = null;
  let 현재 = null;

  for (const b of blocks) {
    if (b.태그 === 'h2') {
      const 다음절 = 절판정(b.텍스트);
      if (다음절) 절 = 다음절;
      현재 = null;
      continue;
    }

    if (b.태그 === 'h3') {
      현재 = null;
      const m = b.텍스트.match(/^\s*(\d+)\.\s*(.+)$/);
      if (!m || !절) continue;
      현재 = {
        번호: Number(m[1]), 제목: m[2].trim(), 절, 종류: '', 시간초: 0,
        봉사형태: '', 설명: '', 지정요점: null, 소제목: [], 묵상: '',
        낭독범위: '', 교재원문: '',
      };
      항목들.push(현재);
      continue;
    }

    if (!현재) continue;

    if (!현재.시간초 && /^\s*\(\d+분\)/.test(b.텍스트)) {
      현재.시간초 = 분초(b.텍스트);
      현재.설명 = b.텍스트.replace(/^\s*\(\d+분\)\s*/, '').trim();
      현재.봉사형태 = 봉사형태읽기(현재.설명);
      현재.지정요점 = 요점읽기(b.본문);
      const { 성구 } = 참조가르기(b.본문);
      현재.종류 = 종류판정(현재.절, 현재.제목, 현재.설명);
      if (현재.종류 === '성경낭독') 현재.낭독범위 = 성구[0] ?? '';
      continue;
    }

    if (/^\s*묵상해 볼 점/.test(b.텍스트)) {
      현재.묵상 = b.텍스트.replace(/^\s*묵상해 볼 점\s*:?\s*/, '').trim();
      continue;
    }

    if (현재.종류 === '보물연설' && b.태그 === 'p') {
      const { 성구, 출판물 } = 참조가르기(b.본문);
      현재.소제목.push({ 문장: 괄호떼기(b.텍스트), 성구, 출판물 });
      continue;
    }

    현재.교재원문 = `${현재.교재원문}${현재.교재원문 ? '\n' : ''}${b.텍스트}`;
  }

  for (const 항목 of 항목들) if (!항목.종류) 항목.종류 = 종류판정(항목.절, 항목.제목, '');
  return 항목들;
}
