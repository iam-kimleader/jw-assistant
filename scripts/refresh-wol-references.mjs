// 현재 21주 준비 자료의 WOL 참고 링크 리디렉션 매니페스트를 갱신한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWeekOptions } from '../src/web-options.mjs';
import { prepareLifeAndMinistry, prepareWatchtower } from '../src/prep-service.mjs';

process.env.OPENAI_API_KEY = '';

const outputPath = new URL('../src/wol-reference-map.json', import.meta.url);
const referenceMap = JSON.parse(readFileSync(outputPath, 'utf8'));
// 조회에 실패한 참고 자료는 원래의 /pc/ 링크 그대로 돌아와 목록에서 조용히 빠진다. 자동 실행이 그것을 알 수 있게 센다.
let unresolved = 0;
let failedWeeks = 0;

function collect(data) {
  const answers = data.answers ?? (data.sections ?? []).flatMap(section => section.answers ?? []);
  for (const answer of answers) {
    for (const reference of answer.참고출판물 ?? []) {
      // 런타임은 /pc/ 링크만 이 목록에서 찾는다. 참고 자료가 없는 질문의 원문 링크(/d/ → /d/)는 담지 않는다.
      if (/\/wol\/pc\//.test(reference.원문URL ?? '') && /\/wol\/d\//.test(reference.url)) referenceMap[reference.원문URL] = reference.url;
      else if (/\/wol\/pc\//.test(reference.url ?? '')) unresolved++;
    }
  }
}

for (const week of buildWeekOptions()) {
  for (const prepare of [prepareLifeAndMinistry, prepareWatchtower]) {
    try {
      collect(await prepare(week.value));
    } catch (error) {
      failedWeeks++;
      console.warn(`${week.value} 참고 링크 갱신 실패.`, error instanceof Error ? error.message : String(error));
    }
  }
}

const sorted = Object.fromEntries(Object.entries(referenceMap).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
console.log(`WOL 참고 링크 ${Object.keys(sorted).length}개를 저장했다.`);
if (unresolved || failedWeeks) {
  console.warn(`풀지 못한 참고 링크 ${unresolved}개, 받지 못한 주간 자료 ${failedWeeks}건이 있다.`);
  process.exitCode = 1;
}
