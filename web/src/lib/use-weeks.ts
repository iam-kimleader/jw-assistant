// 주간 목록은 화면마다 다시 받을 필요가 없다. 모듈에 한 번 담아 두고 나눠 쓴다.
import { useEffect, useState } from 'react';
import { 주간목록, type 주간 } from './api';

let 캐시: ReturnType<typeof 주간목록> | null = null;

function 한번만가져오기() {
  캐시 ??= 주간목록();
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
        // 다음 화면에서 다시 시도할 수 있도록 실패한 약속은 버린다.
        캐시 = null;
        if (살아있음) set오류(실패.message);
      },
    );
    return () => {
      살아있음 = false;
    };
  }, []);

  const 현재주 = 주간들.find(주 => 주.current)?.value ?? 주간들[0]?.value ?? '';
  return { 주간들, 현재주, 오류 };
}
