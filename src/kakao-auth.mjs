// 카카오 로그인의 세 엔드포인트를 부른다. 2026-08-26 공식 문서 기준이다.
const 인가엔드포인트 = 'https://kauth.kakao.com/oauth/authorize';
const 토큰엔드포인트 = 'https://kauth.kakao.com/oauth/token';
const 사용자엔드포인트 = 'https://kapi.kakao.com/v2/user/me';

export function 인가주소({ restApiKey, redirectUri }, state) {
  const 질의 = new URLSearchParams({
    client_id: restApiKey,
    redirect_uri: redirectUri,
    response_type: 'code',
    state,
  });
  return `${인가엔드포인트}?${질의}`;
}

export async function 토큰받기({ restApiKey, clientSecret, redirectUri }, code, 부르기 = fetch) {
  const 응답 = await 부르기(토큰엔드포인트, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: restApiKey,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  });
  const 자료 = await 응답.json();
  // 설정이 틀렸을 때 카카오가 KOE004·KOE006 같은 코드를 준다. 그대로 올려야 고칠 수 있다.
  if (!응답.ok || !자료?.access_token) {
    const 코드 = 자료?.error_code ?? 자료?.error ?? '알 수 없음';
    throw new Error(`카카오 토큰을 받지 못했습니다. (${코드})`);
  }
  return 자료.access_token;
}

export async function 사용자정보(액세스토큰, 부르기 = fetch) {
  const 응답 = await 부르기(사용자엔드포인트, {
    headers: { Authorization: `Bearer ${액세스토큰}` },
  });
  const 자료 = await 응답.json();
  if (!응답.ok || 자료?.id === undefined) {
    const 코드 = 자료?.code ?? 자료?.msg ?? '알 수 없음';
    throw new Error(`카카오 사용자 정보를 받지 못했습니다. (${코드})`);
  }
  return {
    회원번호: String(자료.id),
    닉네임: String(자료.properties?.nickname ?? ''),
  };
}
