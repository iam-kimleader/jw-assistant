// 클립보드에 글을 넣는다. 권한이 막힌 브라우저에서는 선택 영역 복사로 넘어간다.
export async function 클립보드에쓰기(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // 권한이 제한된 브라우저에서는 아래의 선택 영역 복사 방식으로 이어 간다.
    }
  }
  const input = document.createElement('textarea');
  input.value = text;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  document.execCommand('copy');
  input.remove();
}
