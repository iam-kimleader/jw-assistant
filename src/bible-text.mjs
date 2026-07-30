// core/bible/text 의 권별 파일에서 절 본문을 읽어 오는 모듈
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitLines } from './text-lines.mjs';

export function createTextReader(index, dir = 'core/bible/text') {
  const slugOf = new Map(index.books.map(b => [b.num, b.slug]));
  const cache = new Map();

  function bookMap(bookNum) {
    const hit = cache.get(bookNum);
    if (hit) return hit;
    const slug = slugOf.get(bookNum);
    if (!slug) throw new Error(`권을 찾을 수 없다: ${bookNum}`);
    const map = new Map();
    for (const line of splitLines(readFileSync(join(dir, `${slug}.md`), 'utf8'))) {
      const m = line.match(/^(\d+):(\d+)\t(.+)$/);
      if (m) map.set(`${m[1]}:${m[2]}`, m[3]);
    }
    cache.set(bookNum, map);
    return map;
  }

  return {
    // 없는 절은 null 을 준다. 요한복음 8:1-11 처럼 본문에 없는 절이 실제로 있다
    verse(bookNum, chapter, verse) {
      return bookMap(bookNum).get(`${chapter}:${verse}`) ?? null;
    },
  };
}
