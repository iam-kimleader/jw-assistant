// Vercel Blob 비공개 저장소를 감싼다. 판 번호가 다르면 없는 것으로 본다.
export const 현재판 = 1;

export function 저장소만들기(blob) {
  return {
    async 읽기(경로) {
      try {
        const 응답 = await blob.get(경로, { access: 'private' });
        if (!응답?.stream) return null;
        const 담긴것 = JSON.parse(await new Response(응답.stream).text());
        // 낡은 모양은 마이그레이션하지 않는다. 없는 것으로 보고 새로 만들게 한다.
        return 담긴것?.판 === 현재판 ? 담긴것 : null;
      } catch {
        // 저장은 편의이지 필수가 아니다. 읽기 실패로 화면을 막지 않는다.
        return null;
      }
    },

    async 쓰기(경로, 내용) {
      await blob.put(경로, JSON.stringify({ 판: 현재판, ...내용 }), {
        access: 'private',
        contentType: 'application/json',
        allowOverwrite: true,
      });
    },

    async 목록(접두사) {
      const 결과 = await blob.list({ prefix: 접두사 });
      return (결과?.blobs ?? []).map(x => x.pathname);
    },

    async 지우기(경로) {
      await blob.del(경로);
    },
  };
}
