// wol.jw.org 장 페이지 HTML 에서 절 본문을 뽑아내는 파서
const VERSE_OPEN = /<span id="v(\d+)-(\d+)-(\d+)-\d+" class="v">/g;

export function chapterUrl(book, chapter) {
  return `https://wol.jw.org/ko/wol/b/r8/lp-ko/nwtsty/${book}/${chapter}`;
}

// 여는 태그 바로 뒤부터 짝이 맞는 </span> 직전까지를 잘라낸다
function sliceBalanced(html, from) {
  const re = /<(\/?)span\b[^>]*>/g;
  re.lastIndex = from;
  let depth = 1, m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(from, m.index);
  }
  return html.slice(from);
}

function toPlainText(fragment) {
  return fragment
    // 절/장 번호 표시 앵커를 통째로 제거한다 (장의 첫 절은 절 번호 대신 장 번호가 나온다).
    .replace(/<a\b[^>]*class="[^"]*\bvp\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    // 상호참조(+) 와 각주(*) 링크를 통째로 제거한다
    .replace(/<a\b[^>]*class="[^"]*\bb\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<a\b[^>]*class="[^"]*\bfn\b[^"]*"[^>]*>[\s\S]*?<\/a>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&copy;/g, '©')
    // 그 밖의 숫자 엔티티(10진수/16진수)는 실제 문자로 일반화하여 디코딩한다.
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseChapter(html) {
  const marks = [];
  VERSE_OPEN.lastIndex = 0;
  let m;
  while ((m = VERSE_OPEN.exec(html))) {
    marks.push({
      book: Number(m[1]),
      chapter: Number(m[2]),
      verse: Number(m[3]),
      contentStart: VERSE_OPEN.lastIndex,
    });
  }
  const byVerse = new Map();
  for (const mark of marks) {
    const raw = sliceBalanced(html, mark.contentStart);
    const text = toPlainText(raw);
    // 한 절이 여러 조각으로 나뉘어 나오면 이어 붙인다
    const prev = byVerse.get(mark.verse);
    byVerse.set(mark.verse, {
      book: mark.book,
      chapter: mark.chapter,
      verse: mark.verse,
      text: prev ? `${prev.text} ${text}`.trim() : text,
    });
  }
  const verses = [...byVerse.values()].sort((a, b) => a.verse - b.verse);
  // 본문이 빈 절을 조용히 통과시키지 않고 바로 실패시킨다.
  for (const v of verses) {
    if (!v.text) throw new Error(`절 본문이 비어 있다: ${v.book}권 ${v.chapter}장 ${v.verse}절`);
  }
  return verses;
}
