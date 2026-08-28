// 글을 파일로 내려받게 한다. 원고 화면과 보관함이 함께 쓴다.
export function 내려받기(이름: string, 본문: string) {
  const blob = new Blob([본문], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 이름;
  a.click();
  URL.revokeObjectURL(a.href);
}
