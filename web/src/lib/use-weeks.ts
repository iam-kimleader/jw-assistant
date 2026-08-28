// 주간 목록은 화면마다 다시 받을 필요가 없다. 모듈에 한 번 담아 두고 나눠 쓴다.
import { useEffect, useRef, useState } from 'react';
import { 로그인필요오류, 설정저장하기, 주간목록, type 주간 } from './api';
import type { 프로필 } from './talk-api';
import { weekEnd } from '~server/web-options.mjs';

let 캐시: ReturnType<typeof 주간목록> | null = null;

// App 도 같은 자료(사용자 포함)가 필요하다. 요청을 하나만 나가게 여기서 공유한다.
// 실패한 약속은 여기서 바로 버려서, 어느 호출자가 먼저 실패를 보든 다음 시도가
// 새로 요청하게 한다 — 호출자마다 따로 캐시를 비우면 먼저 처리한 쪽에만 의존하게 된다.
export function 한번만가져오기() {
  캐시 ??= 주간목록().catch(실패 => {
    캐시 = null;
    throw 실패;
  });
  return 캐시;
}

export function use주간목록() {
  const [주간들, set주간들] = useState<주간[]>([]);
  const [오류, set오류] = useState('');

  useEffect(() => {
    let 살아있음 = true;
    한번만가져오기().then(
      자료 => 살아있음 && set주간들(자료.weeks),
      실패 => {
        if (!살아있음) return;
        // 로그인이 필요한 경우는 App 이 로그인 화면으로 보낸다. 여기서는 오류로 보이지 않는다.
        if (실패 instanceof 로그인필요오류) return;
        set오류(실패.message);
      },
    );
    return () => {
      살아있음 = false;
    };
  }, []);

  const 현재주 = 주간들.find(주 => 주.current)?.value ?? 주간들[0]?.value ?? '';
  return { 주간들, 현재주, 오류 };
}

// 설정을 저장하면 모듈 캐시의 값도 같이 바꿔야 한다. 안 그러면 다음에 마운트될 때
// 로드 시점의 옛 설정이 다시 올라오고, 그다음 저장이 서버를 옛 값으로 덮는다.
function 설정캐시갱신(설정: 프로필) {
  if (!캐시) return;
  // 캐시가 아직 대기 중이다가 나중에 실패하면 이 체인도 함께 거부된다. 아무도 안 받아 두면
  // 처리되지 않은 거부로 남으니, 여기서 조용히 받아 둔다 — 실제 호출자는 원본 캐시(또는
  // 이 체인을 이어받는 다음 호출)에서 그 실패를 그대로 받는다.
  const 다음캐시 = 캐시.then(자료 => ({ ...자료, 설정 }));
  다음캐시.catch(() => {});
  캐시 = 다음캐시;
}

export function use설정() {
  const [설정, set설정] = useState<프로필 | null>(null);
  // 타이핑마다 저장 요청을 보내지 않게 마지막 값과 타이머를 들고 있다가 묶어서 보낸다.
  const 대기중 = useRef<{ 값: 프로필; 타이머: ReturnType<typeof setTimeout> } | null>(null);

  useEffect(() => {
    let 살아있음 = true;
    한번만가져오기().then(
      자료 => 살아있음 && set설정(자료.설정),
      () => {
        // 로그인이 필요하면 App 이 로그인 화면으로 보낸다. 여기서 따로 알리지 않는다.
      },
    );
    return () => {
      살아있음 = false;
    };
  }, []);

  // 디바운스 도중 화면을 떠나면 마지막 입력이 사라진다. 언마운트 시 바로 흘려보낸다.
  useEffect(() => {
    return () => {
      if (!대기중.current) return;
      clearTimeout(대기중.current.타이머);
      설정저장하기(대기중.current.값).catch(() => {
        // 화면이 이미 사라진 뒤라 오류를 보여줄 곳이 없다. 그래도 시도는 한다.
      });
    };
  }, []);

  function 설정저장(다음: 프로필) {
    set설정(다음);
    설정캐시갱신(다음);
    if (대기중.current) clearTimeout(대기중.current.타이머);
    return new Promise<void>((resolve, reject) => {
      const 타이머 = setTimeout(() => {
        대기중.current = null;
        설정저장하기(다음).then(() => resolve(), reject);
      }, 800);
      대기중.current = { 값: 다음, 타이머 };
    });
  }

  return { 설정, 불러옴: 설정 !== null, 설정저장 };
}

// 선택 상자는 앞뒤 10주만 담는다. 보관함에서 그보다 오래된 주간으로 들어오면 고른 값이
// 목록에 없어 선택 상자가 빈 칸으로 보인다. 그 한 줄만 맨 앞에 끼워 넣는다.
export function 주간목록에끼워넣기(주간들: 주간[], 고른주: string): 주간[] {
  if (!고른주 || 주간들.some(주 => 주.value === 고른주)) return 주간들;
  return [{ value: 고른주, label: `${고른주} ~ ${weekEnd(고른주)}`, current: false }, ...주간들];
}
