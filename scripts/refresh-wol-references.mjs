// 현재 21주 준비 자료의 WOL 참고 링크 리디렉션 매니페스트를 갱신한다.
import { readFileSync, writeFileSync } from 'node:fs';
import { buildWeekOptions } from '../src/web-options.mjs';
import { prepareLifeAndMinistry, prepareWatchtower } from '../src/prep-service.mjs';

process.env.OPENAI_API_KEY = '';

const outputPath = new URL('../src/wol-reference-map.json', import.meta.url);
const referenceMap = JSON.parse(readFileSync(outputPath, 'utf8'));

function collect(data) {
  const answers = data.answers ?? (data.sections ?? []).flatMap(section => section.answers ?? []);
  for (const answer of answers) {
    for (const reference of answer.참고출판물 ?? []) {
      if (reference.원문URL && /\/wol\/d\//.test(reference.url)) referenceMap[reference.원문URL] = reference.url;
    }
  }
}

for (const week of buildWeekOptions()) {
  for (const prepare of [prepareLifeAndMinistry, prepareWatchtower]) {
    try {
      collect(await prepare(week.value));
    } catch (error) {
      console.warn(`${week.value} 참고 링크 갱신 실패.`, error instanceof Error ? error.message : String(error));
    }
  }
}

const sorted = Object.fromEntries(Object.entries(referenceMap).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outputPath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
console.log(`WOL 참고 링크 ${Object.keys(sorted).length}개를 저장했다.`);
