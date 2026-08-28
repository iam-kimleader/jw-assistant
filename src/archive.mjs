// 저장소에 쌓인 경로를 보관함 목록으로 바꾼다. 파싱을 따로 두어 저장소 없이 시험한다.
import { 연설접두사 } from './storage-paths.mjs';

const 주간경로꼴 = /^weeks\/(watchtower|life-ministry)\/(\d{4}-\d{2}-\d{2})\.json$/;
const 연설경로꼴 = /^users\/([0-9]+)\/talks\/(\d{4}-\d{2}-\d{2})-(\d{1,2})\.json$/;
// 같은 주간에 둘 다 있으면 파수대 연구를 먼저 놓는다.
const 종류순서 = { watchtower: 0, 'life-ministry': 1 };

export function 주간경로파싱(경로) {
  const 맞은것 = 주간경로꼴.exec(String(경로 ?? ''));
  return 맞은것 ? { 종류: 맞은것[1], 주간: 맞은것[2] } : null;
}

export function 연설경로파싱(경로) {
  const 맞은것 = 연설경로꼴.exec(String(경로 ?? ''));
  if (!맞은것) return null;
  return { 회원번호: 맞은것[1], 주간: 맞은것[2], 배정번호: Number(맞은것[3]) };
}

async function 연구답변목록(저장소) {
  // 경로에 종류와 주간이 다 들어 있다. 파일은 하나도 읽지 않는다.
  const 경로들 = await 저장소.목록('weeks/').catch(() => []);
  return 경로들
    .map(주간경로파싱)
    .filter(Boolean)
    .sort((가, 나) => 나.주간.localeCompare(가.주간) || 종류순서[가.종류] - 종류순서[나.종류]);
}

async function 연설목록(저장소, 접두사, 회원번호) {
  const 경로들 = await 저장소.목록(접두사).catch(() => []);
  const 줄들 = await Promise.all(경로들.map(async 경로 => {
    const 자리 = 연설경로파싱(경로);
    // 저장소가 접두사를 넓게 잡아 주더라도 남의 자료가 섞이지 않게 여기서 다시 본다.
    if (!자리 || 자리.회원번호 !== String(회원번호)) return null;
    // ponytail: 줄마다 파일을 한 번 읽는다. 배정 제목이 경로에 없어서다. 개인 자료라
    // 지금은 몇 개뿐이고, 느려지면 목록 전용 색인을 따로 둔다.
    const 담긴것 = await 저장소.읽기(경로).catch(() => null);
    if (!담긴것) return null;
    return {
      주간: 자리.주간,
      배정번호: 자리.배정번호,
      배정제목: 담긴것.배정제목 ?? '',
      만든때: 담긴것.만든때 ?? null,
    };
  }));
  return 줄들
    .filter(Boolean)
    .sort((가, 나) => 나.주간.localeCompare(가.주간) || 가.배정번호 - 나.배정번호);
}

export async function 보관목록({ 저장소, 회원번호 }) {
  // 접두사 만들기는 try 밖이다. 회원번호가 이상한 것은 저장소 문제가 아니다.
  const 접두사 = 연설접두사(회원번호);
  return {
    연구답변: await 연구답변목록(저장소),
    연설: await 연설목록(저장소, 접두사, 회원번호),
  };
}
