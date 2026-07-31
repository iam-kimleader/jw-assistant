// HTML 조각에서 태그와 엔티티를 걷어내 사람이 읽는 한 줄 문자열로 만드는 모듈
export function htmlToText(fragment) {
  return String(fragment)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&copy;/g, '©')
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    // &amp; 는 마지막에 푼다. 먼저 풀면 "&amp;lt;" 가 "<" 로 이중 디코딩된다
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}
