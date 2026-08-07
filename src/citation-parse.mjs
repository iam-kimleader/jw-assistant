// wol 출판물의 성구 라벨을 성경 절 주소로 해석하는 모듈
import { toVerseId } from './verse-address.mjs';

// 규칙(완전 일치 → 접두 유일 일치)으로 풀리지 않는 것만 여기에 둔다.
// 미해결로 드러난 약칭이 생기면 한 줄씩 추가한다.
export const 별칭 = {
  '계시록': '요한 계시록',   // 접미가 아니라 접두를 잘라 쓰므로 규칙으로 안 풀린다
  '요한': '요한복음',        // 요한 1·2·3서·계시록과 겹치므로 접두 유일 일치가 안 된다
  '창': '창세기',
  '출': '출애굽기',
  '레': '레위기',
  '민': '민수기',
  '신': '신명기',
  '수': '여호수아',
  '삿': '사사기',
  '삼상': '사무엘상',
  '삼하': '사무엘하',
  '왕상': '열왕기상',
  '왕하': '열왕기하',
  '대상': '역대기상',
  '대하': '역대기하',
  '스': '에스라',
  '느': '느헤미야',
  '에': '에스더',
  '잠': '잠언',
  '전': '전도서',
  '아': '솔로몬의 노래',
  '사': '이사야',
  '렘': '예레미야',
  '애': '예레미야 애가',
  '겔': '에스겔',
  '단': '다니엘',
  '호': '호세아',
  '욜': '요엘',
  '암': '아모스',
  '옵': '오바댜',
  '욘': '요나',
  '미': '미가',
  '나': '나훔',
  '합': '하박국',
  '습': '스바냐',
  '학': '학개',
  '슥': '스가랴',
  '말': '말라기',
  '마': '마태복음',
  '막': '마가복음',
  '눅': '누가복음',
  '요': '요한복음',
  '행': '사도행전',
  '롬': '로마서',
  '고전': '고린도 전서',
  '고후': '고린도 후서',
  '갈': '갈라디아서',
  '엡': '에베소서',
  '빌': '빌립보서',
  '골': '골로새서',
  '살전': '데살로니가 전서',
  '살후': '데살로니가 후서',
  '딤전': '디모데 전서',
  '딤후': '디모데 후서',
  '딛': '디도서',
  '몬': '빌레몬서',
  '히': '히브리서',
  '약': '야고보서',
  '벧전': '베드로 전서',
  '벧후': '베드로 후서',
  '요1': '요한 1서',
  '요2': '요한 2서',
  '요3': '요한 3서',
  '유': '유다서',
  '계': '요한 계시록',
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
  const 문맥 = typeof 직전권 === 'object' && 직전권 ? 직전권 : { 권: 직전권, 장: null };
  const m = t.match(/^(.*?)\s*(\d+):([\d,\s-]+)$/);
  const 장없는절목록 = !m ? t.match(/^([\d,\s-]+)$/) : null;
  if (!m && !장없는절목록) return { 성공: false, 사유: `성구 형식을 해석할 수 없다: ${라벨}` };

  const 책이름 = m ? m[1].trim() : '';
  let book, title;
  if (책이름) {
    const r = resolveBook(index, 책이름);
    if (!r.성공) return r;
    book = r.book;
    title = r.title;
  } else {
    if (문맥.권 == null) {
      return { 성공: false, 사유: `권 이름이 없는데 이어받을 앞선 권이 없다: ${라벨}` };
    }
    book = 문맥.권;
    title = index.books.find(b => b.num === book)?.title ?? String(book);
  }

  const chapter = m ? Number(m[2]) : 문맥.장;
  if (chapter == null) {
    return { 성공: false, 사유: `장 번호가 없는데 이어받을 앞선 장이 없다: ${라벨}` };
  }
  const 절들 = [];
  const 절본문 = m ? m[3] : 장없는절목록[1];
  for (const 조각 of 절본문.split(',')) {
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
  return { 성공: true, 권: book, 장: chapter, title, 주소들 };
}

// 같은 괄호 안의 참조는 data-bid 의 그룹 번호가 같다.
// 권 이름 생략은 그 그룹 안에서만 직전 항목으로부터 이어받는다.
export function resolveAll(index, 인용들) {
  let 현재그룹 = null;
  let 직전문맥 = null;
  return 인용들.map(c => {
    const 그룹 = String(c.bid ?? '').split('-')[0];
    if (그룹 !== 현재그룹) {
      현재그룹 = 그룹;
      직전문맥 = null;
    }
    const 해석 = parseCitation(index, c.라벨, 직전문맥);
    if (해석.성공) 직전문맥 = { 권: 해석.권, 장: 해석.장 };
    return { ...c, 해석 };
  });
}
