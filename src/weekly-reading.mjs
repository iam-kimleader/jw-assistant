// 주간 성경 읽기 장 범위를 로컬 성경 본문으로 펼치고 폴백 보물을 고른다.
function 책찾기(index, title) {
  const wanted = String(title).replace(/\s+/g, '');
  const book = index.books.find(item => item.title.replace(/\s+/g, '') === wanted);
  if (!book) throw new Error(`주간 성경 읽기 권을 찾을 수 없다: ${title}`);
  return book;
}

export function buildWeeklyReadingEvidence(label, tools) {
  const range = String(label ?? '').trim();
  const match = range.match(/^(.+?)\s+(\d+)(?:\s*[-–—]\s*(\d+))?(?:장|편)$/u);
  if (!match) throw new Error(`주간 성경 읽기 범위를 해석할 수 없다: ${range}`);

  const book = 책찾기(tools.index, match[1]);
  const fromChapter = Number(match[2]);
  const toChapter = Number(match[3] ?? match[2]);
  if (toChapter < fromChapter) throw new Error(`주간 성경 읽기 범위가 거꾸로 됐다: ${range}`);

  const verses = [];
  for (let chapter = fromChapter; chapter <= toChapter; chapter++) {
    const chapterInfo = book.chapters.find(item => item.num === chapter);
    if (!chapterInfo) throw new Error(`주간 성경 읽기 장을 찾을 수 없다: ${book.title} ${chapter}장`);
    for (let verse = chapterInfo.firstVerseNumber; verse <= chapterInfo.lastVerseNumber; verse++) {
      const text = tools.text.verse(book.num, chapter, verse);
      if (text) verses.push({ 주소: `${book.title} ${chapter}:${verse}`, 본문: text });
    }
  }
  if (!verses.length) throw new Error(`주간 성경 읽기 본문이 비어 있다: ${range}`);
  return { 범위: range, 본문: verses };
}

function 보물점수(verse) {
  const text = verse.본문;
  const signals = [
    [/여호와/u, 3],
    [/공의|정의|사랑|충성|자비|용서|지혜|신뢰|희망|구원|겸손|순종|보호/u, 2],
    [/마음|선한|악한|의로운|기뻐|미워|두려워|들어라|행하여라|하지 마라/u, 1],
  ];
  let score = text.length >= 30 && text.length <= 180 ? 1 : 0;
  for (const [pattern, weight] of signals) score += pattern.test(text) ? weight : 0;
  return score;
}

export function buildWeeklyReadingFallback(reading) {
  const selected = reading.본문
    .map((verse, index) => ({ verse, index, score: 보물점수(verse) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)[0].verse;
  return {
    답변: `${selected.주소}의 말씀이 인상 깊습니다. ${selected.본문} 이 구절을 묵상하면서 그 안에 나타난 여호와의 생각을 살피고 생활에 적용해야겠다는 교훈을 얻을 수 있습니다.`,
    성구: [{ 라벨: `${reading.범위}에서 선택한 성구`, 본문: [selected] }],
  };
}
