// 파일 내용을 줄 단위로 나누되 CRLF 로 들어와도 줄 끝의 \r 을 허용하는 유틸리티
export function splitLines(content) {
  return content.split(/\r?\n/);
}
