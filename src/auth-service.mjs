// 카카오 로그인 흐름을 엮는다. HTTP 를 모르므로 어댑터가 결과를 응답으로 옮긴다.
export function 인증만들기({ 설정, 카카오, 저장소, 무작위, 지금 = () => Date.now() }) {
  const 사용자경로 = 회원번호 => `users/${회원번호}/profile.json`;

  return {
    사용자경로,

    로그인시작() {
      const state = 무작위();
      return { 위치: 카카오.인가주소(설정, state), state };
    },

    async 로그인완료({ code, state, 저장된state }) {
      if (!state || !저장된state || state !== 저장된state) {
        return { 결과: '거부', 사유: '로그인 요청이 확인되지 않았습니다. 다시 시도해 주십시오.' };
      }
      if (!code) return { 결과: '거부', 사유: '인가 코드가 없습니다.' };

      let 신원;
      try {
        // 카카오 토큰은 여기서만 쓰고 버린다. 보관하지 않는다.
        const 액세스토큰 = await 카카오.토큰받기(설정, code);
        신원 = await 카카오.사용자정보(액세스토큰);
      } catch (실패) {
        return { 결과: '거부', 사유: 실패.message };
      }

      const 기록 = await 저장소.읽기(사용자경로(신원.회원번호));
      if (기록) {
        // 닉네임은 카카오에서 바뀔 수 있으므로 방금 받은 것을 쓴다.
        return { 결과: '승인', 사용자: { 회원번호: 신원.회원번호, 닉네임: 신원.닉네임 } };
      }
      return { 결과: '초대필요', 신원 };
    },

    async 초대확인({ 코드, 신원 }) {
      if (!신원?.회원번호) return { 통과: false };
      if (!설정.초대코드 || 코드 !== 설정.초대코드) return { 통과: false };

      const 사용자 = { 회원번호: 신원.회원번호, 닉네임: 신원.닉네임 ?? '' };
      await 저장소.쓰기(사용자경로(사용자.회원번호), {
        ...사용자,
        승인된때: new Date(지금()).toISOString(),
      });
      return { 통과: true, 사용자 };
    },
  };
}
