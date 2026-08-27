// 주간 목록은 화면마다 다시 받을 필요가 없다. 모듈에 한 번 담아 두고 나눠 쓴다.
import { useEffect, useState } from 'react';
import { 로그인필요오류, 주간목록, type 주간 } from './api';

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
