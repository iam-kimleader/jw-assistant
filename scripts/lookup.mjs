// 성구를 받아 본문과 정방향·역방향 상호 참조를 함께 펼쳐 보여주는 조회 도구
import { loadIndex, parseRange, toAddress, formatAddress } from '../src/verse-address.mjs';
import { createTextReader } from '../src/bible-text.mjs';
import { loadRefs } from '../src/refs-lookup.mjs';

const USAGE = [
  '사용법',
  '  성구 마태복음 24:14',
  '  성구 마태복음 28:19-20',
  '  성구 시편 3:0-3',
  '',
  'npm 으로도 부를 수 있다. 이때는 인자 앞에 -- 가 필요하다.',
  '  npm run 성구 -- "마태복음 24:14"',
  '',
  '권 이름은 공백을 넣어도 되고 빼도 된다. "요한 계시록 22:21" 과 "요한계시록 22:21" 둘 다 받는다.',
  '시편 표제는 0절로 조회한다.',
].join('\n');

const MISSING = '(본문 없음)';

// 난외 참조 대부분은 한두 절이지만 다니엘 2:4-7:28 처럼 200절짜리도 있다.
// 그런 범위를 통째로 펼치면 성구 하나 조회에 수백 줄이 쏟아지므로 주소만 보여준다.
const INLINE_LIMIT = 12;

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

// 산출물이 아직 없을 때 날것의 스택 대신 무엇을 해야 하는지 알려 준다
function loadOrExit(what, load) {
  try {
    return load();
  } catch (e) {
    console.error(`${what} 를 읽을 수 없다: ${e.message}`);
    console.error('README.md 의 파이프라인 순서대로 산출물을 먼저 만들어야 한다.');
    process.exit(1);
  }
}

const index = loadOrExit('성경 색인', () => loadIndex());

let range;
try {
  range = parseRange(index, input);
} catch (e) {
  console.error(`${e.message}\n\n${USAGE}`);
  process.exit(1);
}

const text = createTextReader(index);
const refs = loadOrExit('상호 참조', () => loadRefs(index));

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
      const span = entry.toId - entry.fromId + 1;
      if (span > INLINE_LIMIT) {
        console.log(`    ▶ ${entry.label}  (${span}절 — 전체는 npm run 성구 -- "${entry.label}")`);
        continue;
      }
      console.log(`    ▶ ${entry.label}`);
      for (let target = entry.fromId; target <= entry.toId; target++) {
        const ta = toAddress(index, target);
        console.log(`       ${ta.chapter}:${ta.verse}  ${text.verse(ta.book, ta.chapter, ta.verse) ?? MISSING}`);
      }
    }
  }

  // loadRefs 가 이미 중복을 없애고 정렬해서 준다
  const backward = refs.reverse.get(id) ?? [];
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
