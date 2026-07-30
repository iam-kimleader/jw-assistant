// 상호 참조를 정방향과 역방향 양쪽으로 조회할 수 있게 색인하는 모듈
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitLines } from './text-lines.mjs';
import { toVerseId, parseRange } from './verse-address.mjs';

// forward: 출발 절 ID -> [{ label, fromId, toId }]
//   원본 TSV 에 같은 참조가 두 번 적힌 줄이 있어도 그대로 둔다. 출판물을 충실히 반영한다.
// reverse: 도착 절 ID -> [출발 절 ID]  (범위 참조는 낱개 절로 펼쳐서 담는다)
//   "가리킨다" 는 관계이므로 중복이 의미가 없다. 중복을 없애고 오름차순으로 굳혀서 준다.
//   그래야 소비자가 length 로 인용 횟수를 세도 부풀려지지 않는다.
export function loadRefs(index, dir = 'core/bible/refs') {
  const forward = new Map();
  const reverseSets = new Map();

  for (const book of index.books) {
    const content = readFileSync(join(dir, `${book.slug}.tsv`), 'utf8');
    for (const line of splitLines(content)) {
      if (!line) continue;
      const m = line.match(/^(\d+):(\d+)\t(.+)$/);
      if (!m) throw new Error(`${book.slug} 의 형식이 틀린 줄이다: ${line}`);

      const sourceId = toVerseId(index, book.num, Number(m[1]), Number(m[2]));
      const entries = m[3].split(', ').map(label => {
        const r = parseRange(index, label);
        return { label, fromId: r.fromId, toId: r.toId };
      });
      forward.set(sourceId, entries);

      for (const e of entries) {
        for (let id = e.fromId; id <= e.toId; id++) {
          const set = reverseSets.get(id);
          if (set) set.add(sourceId);
          else reverseSets.set(id, new Set([sourceId]));
        }
      }
    }
  }

  const reverse = new Map();
  for (const [id, set] of reverseSets) {
    reverse.set(id, [...set].sort((a, b) => a - b));
  }
  return { forward, reverse };
}
