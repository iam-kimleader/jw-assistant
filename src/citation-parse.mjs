// wol 출판물의 성구 라벨을 성경 절 주소로 해석하는 모듈
import { toVerseId } from './verse-address.mjs';

// 규칙(완전 일치 → 접두 유일 일치)으로 풀리지 않는 것만 여기에 둔다.
// 미해결로 드러난 약칭이 생기면 한 줄씩 추가한다.
export const 별칭 = {
  '계시록': '요한 계시록',   // 접미가 아니라 접두를 잘라 쓰므로 규칙으로 안 풀린다
  '요한': '요한복음',        // 요한 1·2·3서·계시록과 겹치므로 접두 유일 일치가 안 된다
};

const 압축 = s => String(s).replace(/\s+/g, '');

export function resolveBook(index, 이름) {
  const 원본 = String(이름).trim();
  if (!원본) return { 성공: false, 사유: '권 이름이 비어 있다' };
  const key = 압축(원본);

  const 완전 = index.books.find(b => 압축(b.title) === key);
  if (완전) return { 성공: true, book: 완전.num, title: 완전.title };

  const 별칭이름 = 별칭[원본] ?? 별칭[key];
  if (별칭이름) {
    const b = index.books.find(x => x.title === 별칭이름);
    if (b) return { 성공: true, book: b.num, title: b.title };
  }

  const 후보 = index.books.filter(b => 압축(b.title).startsWith(key));
  if (후보.length === 1) return { 성공: true, book: 후보[0].num, title: 후보[0].title };
  if (후보.length > 1) {
    return { 성공: false, 사유: `권 이름이 모호하다 — 후보가 여럿이다: ${원본} → ${후보.map(b => b.title).join(', ')}` };
  }
  return { 성공: false, 사유: `권을 찾을 수 없다: ${원본}` };
}

// "야고보 4:8ㄱ" 의 ㄱ·ㄴ 은 절의 앞부분·뒷부분을 가리키는 표시일 뿐 절 번호가 아니다.
// 숫자 바로 뒤에 붙은 낱자모만 떼어 낸다.
function 정규화(라벨) {
  return String(라벨)
    .replace(/[;.\s]+$/, '')
    .replace(/(\d)[ㄱ-ㅎ]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCitation(index, 라벨, 직전권 = null) {
  const t = 정규화(라벨);
  const m = t.match(/^(.*?)\s*(\d+):([\d,\s-]+)$/);
  if (!m) return { 성공: false, 사유: `성구 형식을 해석할 수 없다: ${라벨}` };

  const 책이름 = m[1].trim();
  let book, title;
  if (책이름) {
    const r = resolveBook(index, 책이름);
    if (!r.성공) return r;
    book = r.book;
    title = r.title;
  } else {
    if (직전권 == null) {
      return { 성공: false, 사유: `권 이름이 없는데 이어받을 앞선 권이 없다: ${라벨}` };
    }
    book = 직전권;
    title = index.books.find(b => b.num === book)?.title ?? String(book);
  }

  const chapter = Number(m[2]);
  const 절들 = [];
  for (const 조각 of m[3].split(',')) {
    const s = 조각.trim();
    if (!s) continue;
    const 범위 = s.match(/^(\d+)\s*-\s*(\d+)$/);
    if (범위) {
      const from = Number(범위[1]);
      const to = Number(범위[2]);
      if (to < from) return { 성공: false, 사유: `범위가 거꾸로 됐다: ${라벨}` };
      for (let v = from; v <= to; v++) 절들.push(v);
      continue;
    }
    if (/^\d+$/.test(s)) { 절들.push(Number(s)); continue; }
    return { 성공: false, 사유: `절 표기를 해석할 수 없다: ${라벨}` };
  }
  if (!절들.length) return { 성공: false, 사유: `절이 없다: ${라벨}` };

  const 주소들 = [];
  for (const verse of 절들) {
    let verseId;
    try {
      verseId = toVerseId(index, book, chapter, verse);
    } catch (e) {
      return { 성공: false, 사유: `${e.message} (${라벨})` };
    }
    주소들.push({ book, chapter, verse, verseId });
  }
  return { 성공: true, 권: book, title, 주소들 };
}

// 같은 괄호 안의 참조는 data-bid 의 그룹 번호가 같다.
// 권 이름 생략은 그 그룹 안에서만 직전 항목으로부터 이어받는다.
export function resolveAll(index, 인용들) {
  let 현재그룹 = null;
  let 직전권 = null;
  return 인용들.map(c => {
    const 그룹 = String(c.bid ?? '').split('-')[0];
    if (그룹 !== 현재그룹) {
      현재그룹 = 그룹;
      직전권 = null;
    }
    const 해석 = parseCitation(index, c.라벨, 직전권);
    if (해석.성공) 직전권 = 해석.권;
    return { ...c, 해석 };
  });
}
