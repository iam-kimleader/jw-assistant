// 파싱한 기사 구조와 코어 본문으로 파수대 예습지 마크다운을 만드는 모듈
import { resolveAll } from './citation-parse.mjs';
import { formatAddress } from './verse-address.mjs';

const 본문없음 = '(본문 없음)';

// 난외 참조 목록은 길어질 수 있어 개수와 주소 몇 개만 보여준다.
// 궁금한 것은 `성구 <주소>` 로 따로 본다.
const 역참조표시 = 4;

function 절블록(도구, 주소들) {
  const 줄 = [];
  for (const a of 주소들) {
    const 본문 = 도구.text.verse(a.book, a.chapter, a.verse) ?? 본문없음;
    줄.push(`  > ${본문}`);
  }
  return 줄;
}

function 역참조요약(도구, 주소들) {
  const 모음 = new Set();
  for (const a of 주소들) {
    for (const src of 도구.refs.reverse.get(a.verseId) ?? []) 모음.add(src);
  }
  if (!모음.size) return null;
  const 목록 = [...모음].sort((x, y) => x - y);
  const 보일것 = 목록.slice(0, 역참조표시).map(id => formatAddress(도구.index, id));
  const 꼬리 = 목록.length > 역참조표시 ? ` 외 ${목록.length - 역참조표시}건` : '';
  return `  이곳을 가리키는 참조 ${목록.length}건 — ${보일것.join(', ')}${꼬리}`;
}

export function buildPrepSheet(기사, 도구, 출처) {
  const 줄 = [];
  const 미해결 = [];
  let 인용수 = 0;
  let 해석수 = 0;

  줄.push(`# 파수대 연구 — ${기사.주라벨}`);
  줄.push(`## ${기사.제목}`);
  줄.push('');
  if (기사.노래) 줄.push(기사.노래);
  줄.push(`기사 ${출처.기사URL}`);
  줄.push('');
  if (기사.요점) {
    줄.push(`**요점** ${기사.요점}`);
    줄.push('');
  }

  if (기사.주제성구) {
    const 해석 = resolveAll(도구.index, [{ ...기사.주제성구, 낭독: false }])[0].해석;
    인용수++;
    줄.push(`**주제 성구** ${기사.주제성구.라벨}`);
    if (해석.성공) {
      해석수++;
      줄.push(...절블록(도구, 해석.주소들));
    } else {
      미해결.push({ 라벨: 기사.주제성구.라벨, 사유: 해석.사유 });
      줄.push(`  > ⚠ 해석 실패 — ${해석.사유}`);
    }
    줄.push('');
  }

  줄.push('---');
  줄.push('');

  for (const g of 기사.문단그룹) {
    const 제목 = g.문단번호.length
      ? `### ${g.문단번호.length > 1 ? `${g.문단번호[0]}-${g.문단번호[g.문단번호.length - 1]}` : g.문단번호[0]}문단`
      : '### 문단';
    줄.push(제목);
    줄.push('');
    줄.push(`**질문** ${g.질문}`);
    줄.push('');
    줄.push(`문단 읽기 → ${출처.기사URL}`);
    줄.push('');

    const 해석들 = resolveAll(도구.index, g.인용);
    if (해석들.length) {
      줄.push('**인용 성구**');
      줄.push('');
      for (const c of 해석들) {
        인용수++;
        if (!c.해석.성공) {
          미해결.push({ 라벨: c.라벨, 사유: c.해석.사유 });
          줄.push(`- **${c.라벨}** ⚠ 해석 실패 — ${c.해석.사유}`);
          줄.push('');
          continue;
        }
        해석수++;
        const 이름 = formatAddress(도구.index, c.해석.주소들[0].verseId);
        const 끝 = c.해석.주소들[c.해석.주소들.length - 1];
        const 범위 = c.해석.주소들.length > 1 ? `${이름}-${끝.verse}` : 이름;
        줄.push(`- **${범위}**${c.낭독 ? ' (낭독)' : ''}`);
        줄.push(...절블록(도구, c.해석.주소들));
        const 역 = 역참조요약(도구, c.해석.주소들);
        if (역) {
          줄.push('');
          줄.push(역);
        }
        줄.push('');
      }
    }

    줄.push('**내 답**');
    줄.push('');
    줄.push('');
    줄.push('---');
    줄.push('');
  }

  줄.push('## 미해결');
  줄.push('');
  if (미해결.length) {
    for (const m of 미해결) 줄.push(`- ⚠ \`${m.라벨}\` — ${m.사유}`);
  } else {
    줄.push('없다. 인용 성구가 전부 해석됐다.');
  }
  줄.push('');
  줄.push('## 출처');
  줄.push('');
  줄.push(`- 기사 ${출처.기사URL} — ${출처.조회날짜} 조회`);
  줄.push(`- 주간 집회 ${출처.주페이지URL} — ${출처.조회날짜} 조회`);
  줄.push('');

  return { 마크다운: 줄.join('\n'), 통계: { 인용수, 해석수, 미해결 } };
}
