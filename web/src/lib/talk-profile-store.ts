// 화자 프로필을 브라우저에 남긴다. 저장은 편의 기능이지 필수가 아니다.
import { 기본프로필 } from '~server/talk-profile.mjs';
import type { 프로필 } from './talk-api';

const 프로필키 = 'jw-assistant-talk-profile';

export function 기본값(): 프로필 {
  return 기본프로필() as 프로필;
}

export function 프로필읽기(): 프로필 {
  try {
    return { ...기본값(), ...JSON.parse(localStorage.getItem(프로필키) ?? '{}') };
  } catch {
    return 기본값();
  }
}

export function 프로필쓰기(프로필: 프로필) {
  // 사생활 보호 모드 등 저장소가 막힌 브라우저에서도 화면은 계속 돌아야 한다.
  try {
    localStorage.setItem(프로필키, JSON.stringify(프로필));
  } catch {
    // 저장 실패는 조용히 넘어간다. 프로필은 이번 방문 동안 메모리에 남는다.
  }
}
