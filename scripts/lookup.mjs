// 성구를 받아 본문과 정방향·역방향 상호 참조를 함께 펼쳐 보여주는 조회 도구
import { loadIndex, parseRange, toAddress, formatAddress } from '../src/verse-address.mjs';
import { createTextReader } from '../src/bible-text.mjs';
import { loadRefs } from '../src/refs-lookup.mjs';

const USAGE = [
  '사용법',
  '  npm run 성구 -- "마태복음 24:14"',
  '  npm run 성구 -- "마태복음 28:19-20"',
  '  npm run 성구 -- "시편 3:0-3"',
  '',
  '권 이름은 공백을 넣어도 되고 빼도 된다. "요한 계시록 22:21" 과 "요한계시록 22:21" 둘 다 받는다.',
].join('\n');

const MISSING = '(본문 없음)';

// 역방향 목록은 길어질 수 있어 본문을 발췌해서 보여준다
function excerpt(text, limit = 60) {
  if (!text) return MISSING;
  const chars = [...text];
  return chars.length <= limit ? text : chars.slice(0, limit).join('') + '…';
}

const input = process.argv.slice(2).join(' ').trim();
if (!input) {
  console.error(USAGE);
  process.exit(1);
}

const index = loadIndex();

let range;
try {
  range = parseRange(index, input);
} catch (e) {
  console.error(`${e.message}\n\n${USAGE}`);
  process.exit(1);
}

const text = createTextReader(index);
const refs = loadRefs(index);

const count = range.toId - range.fromId + 1;
const header = `${range.title} ${range.fromChapter}:${range.fromVerse}` +
  (count > 1 ? ` – ${range.toChapter}:${range.toVerse}  (${count}절)` : '');
console.log(`\n${'━'.repeat(60)}\n${header}\n${'━'.repeat(60)}`);

for (let id = range.fromId; id <= range.toId; id++) {
  const here = toAddress(index, id);
  console.log(`\n■ ${here.title} ${here.chapter}:${here.verse}`);
  console.log(`  ${text.verse(here.book, here.chapter, here.verse) ?? MISSING}`);

  const forward = refs.forward.get(id) ?? [];
  if (forward.length) {
    console.log(`\n  ─ 이 성구가 가리키는 참조 ${forward.length}개`);
    for (const entry of forward) {
      console.log(`    ▶ ${entry.label}`);
      for (let target = entry.fromId; target <= entry.toId; target++) {
        const ta = toAddress(index, target);
        console.log(`       ${ta.chapter}:${ta.verse}  ${text.verse(ta.book, ta.chapter, ta.verse) ?? MISSING}`);
      }
    }
  }

  const backward = [...new Set(refs.reverse.get(id) ?? [])].sort((a, b) => a - b);
  if (backward.length) {
    console.log(`\n  ─ 이 성구를 가리키는 참조 ${backward.length}개`);
    for (const source of backward) {
      const sa = toAddress(index, source);
      console.log(`    ◀ ${formatAddress(index, source)}`);
      console.log(`       ${excerpt(text.verse(sa.book, sa.chapter, sa.verse))}`);
    }
  }

  if (!forward.length && !backward.length) {
    console.log('\n  ─ 이 성구에는 난외 참조가 없다.');
  }
}
console.log();
