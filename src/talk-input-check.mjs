// 공개강연 입력의 검증 규칙. 서버와 브라우저가 같은 규칙을 쓰도록 의존성 없이 떼어 둔다.
export function 공개강연입력검증(입력) {
  const 위반 = [];
  if (!String(입력?.제목 ?? '').trim()) 위반.push('제목이 비어 있습니다.');
  const 소제목 = (입력?.소제목 ?? []).filter(x => String(x?.문장 ?? '').trim());
  if (소제목.length < 2) 위반.push('소제목이 둘 이상 필요합니다.');
  if ((입력?.소제목 ?? []).length !== 소제목.length) 위반.push('빈 소제목 칸이 있습니다.');
  return { 통과: 위반.length === 0, 위반 };
}
