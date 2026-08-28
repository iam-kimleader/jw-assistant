// 배정을 고르고 뼈대를 잡아 원고까지 만드는 연설 준비 화면이다.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import AssignmentCards from '@/components/AssignmentCards';
import DraftOutput from '@/components/DraftOutput';
import OutlineTable from '@/components/OutlineTable';
import PublicTalkForm from '@/components/PublicTalkForm';
import SpeakerProfileForm from '@/components/SpeakerProfileForm';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import WeekPicker from '@/components/WeekPicker';
import { 공개강연입력검증 } from '~server/talk-input-check.mjs';
import {
  배정가져오기,
  보관된연설가져오기,
  뼈대만들기,
  원고만들기,
  type 공개강연입력,
  type 배정,
  type 산출물키,
  type 시간정보,
  type 프로필 as 프로필형,
  type 뼈대 as 뼈대형,
} from '@/lib/talk-api';
import { useSearchParams } from 'react-router-dom';
import { use주간목록, use설정, 주간목록에끼워넣기 } from '@/lib/use-weeks';
import { cn } from '@/lib/utils';

const 빈공개강연: 공개강연입력 = {
  제목: '',
  주제성구: '',
  배정시간: 30 * 60,
  소제목: [{ 문장: '' }, { 문장: '' }],
};

type 원고결과 = {
  산출물: Record<산출물키, string>;
  시간: 시간정보;
  경고들: string[];
};

export default function Talk() {
  const { 주간들, 현재주, 오류: 주간오류 } = use주간목록();
  const [질의] = useSearchParams();
  const 청한주 = 질의.get('주간') ?? '';
  // 배정은 목록을 받은 뒤에야 고를 수 있다. 한 번 쓰고 비워서, 그다음 주간을 바꿔도
  // 다시 튀어나오지 않게 한다. get 이 없을 때 주는 null 을 Number 가 0 으로 바꾸므로
  // 그대로 두면 평범한 /talk 방문에서도 첫 배정이 저절로 열린다. NaN 으로 받는다.
  const 청한배정 = useRef(Number(질의.get('배정번호') ?? NaN));
  const [고른주, set고른주] = useState('');
  const { 설정: 프로필, 불러옴: 설정불러옴, 설정저장 } = use설정();
  const [설정오류, set설정오류] = useState('');

  const [배정들, set배정들] = useState<배정[]>([]);
  const [배정안내, set배정안내] = useState('주간을 선택하세요.');
  const [배정오류, set배정오류] = useState('');
  const [선택배정, set선택배정] = useState<배정 | null>(null);
  const [선택배정번호, set선택배정번호] = useState(-1);
  // 복원 응답이 늦게 와도 그 사이 다른 배정을 골랐으면 무시하려고 최신 선택을 들고 있는다.
  const 최근배정선택 = useRef<배정 | null>(null);

  const [공개입력, set공개입력] = useState<공개강연입력>(빈공개강연);

  const [뼈대, set뼈대] = useState<뼈대형 | null>(null);
  const [뼈대경고, set뼈대경고] = useState('');
  const [뼈대오류, set뼈대오류] = useState('');
  const [뼈대만드는중, set뼈대만드는중] = useState(false);

  const [원고, set원고] = useState<원고결과 | null>(null);
  const [원고오류, set원고오류] = useState('');
  const [원고만드는중, set원고만드는중] = useState(false);
  // 복원 응답이 뼈대 생성 도중이나 완성 이후에 와도 방금 만든/만들고 있는 걸 덮어쓰지 않는다.
  const 뼈대준비됨 = useRef(false);
  뼈대준비됨.current = Boolean(뼈대) || 뼈대만드는중;

  // 보관함에서 왔으면 그 주간으로 연다. 아니면 이번 주다.
  useEffect(() => {
    if (고른주) return;
    if (청한주) set고른주(청한주);
    else if (현재주) set고른주(현재주);
  }, [현재주, 청한주, 고른주]);

  const 산출물초기화 = useCallback(() => {
    set뼈대(null);
    set뼈대경고('');
    set뼈대오류('');
    set원고(null);
    set원고오류('');
  }, []);

  // 자격판정은 성별과 임명만 본다. 나머지 항목까지 걸면 글자 하나 칠 때마다 API 를 두드리게 된다.
  const 성별 = 프로필?.성별;
  const 임명 = 프로필?.임명;

  useEffect(() => {
    if (!고른주 || !프로필) return;
    let 살아있음 = true;
    set배정안내('배정을 불러오는 중입니다.');
    set배정오류('');
    set선택배정(null);
    set선택배정번호(-1);
    산출물초기화();

    배정가져오기(고른주, 프로필).then(
      자료 => {
        if (!살아있음) return;
        const 목록 = [...자료.배정, 자료.공개강연카드].filter(Boolean) as 배정[];
        set배정들(목록);
        set배정안내('');
        // 보관함에서 배정까지 지정해 들어왔으면 그 자리를 눌러 준 것처럼 연다.
        const 청한번호 = 청한배정.current;
        청한배정.current = NaN;
        if (Number.isInteger(청한번호) && 목록[청한번호]) 배정고르기(목록[청한번호], 청한번호);
      },
      실패 => {
        if (!살아있음) return;
        set배정들([]);
        set배정안내('');
        set배정오류(실패.message);
      },
    );
    return () => {
      살아있음 = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [고른주, 성별, 임명, 산출물초기화]);

  function 프로필고침(다음: 프로필형) {
    설정저장(다음).catch(실패 => {
      set설정오류(실패 instanceof Error ? 실패.message : '설정을 저장하지 못했습니다.');
    });
  }

  function 배정고르기(값: 배정, 미리받은번호?: number) {
    set선택배정(값);
    최근배정선택.current = 값;
    산출물초기화();
    const 번호 = 미리받은번호 ?? 배정들.indexOf(값);
    set선택배정번호(번호);
    if (번호 < 0 || !고른주) return;
    보관된연설가져오기(고른주, 번호, 값.제목).then(
      ({ 자료 }) => {
        // 응답이 오는 사이 다른 배정을 골랐으면 이 응답은 버린다. 그새 고른 화면을
        // 예전 배정의 자료로 덮어쓰면 안 된다. 뼈대를 만들고 있거나 이미 만들어졌으면
        // 방금 돈 들여 만든 것을 예전 저장분으로 덮어쓰면 안 되니 통째로 건너뛴다.
        if (최근배정선택.current !== 값 || !자료 || 뼈대준비됨.current) return;
        if (자료.뼈대) set뼈대(자료.뼈대);
        // 서버는 API 응답을 그대로 저장한다. 화면 상태는 모양이 달라 여기서 맞춘다.
        if (자료.원고) {
          set원고({
            산출물: 자료.원고.산출물,
            시간: 자료.원고.시간,
            경고들: [...(자료.원고.구조체?.경고 ?? []), 자료.원고.생성?.warning].filter(
              Boolean,
            ) as string[],
          });
        }
      },
      () => {
        // 복원 실패는 알리지 않는다. 없는 것과 같이 다루고 새로 만들면 된다.
        // 상태를 바꾸지 않으므로 뒤늦게 와도 최신 선택을 건드리지 않는다.
      },
    );
  }

  const 공개강연인가 = 선택배정?.종류 === '공개강연';
  const 검증 = useMemo(() => 공개강연입력검증(공개입력), [공개입력]) as {
    통과: boolean;
    위반: string[];
  };
  const 뼈대가능 = Boolean(선택배정) && (!공개강연인가 || 검증.통과);

  async function 뼈대잡기() {
    if (!선택배정 || !프로필 || 선택배정번호 < 0) return;
    set뼈대만드는중(true);
    set뼈대오류('');
    try {
      const 자료 = await 뼈대만들기({
        배정: 선택배정,
        프로필,
        ...(공개강연인가 ? { 공개강연입력: 공개입력 } : {}),
        주간: 고른주,
        배정번호: 선택배정번호,
        배정제목: 선택배정.제목,
      });
      set뼈대(자료.뼈대);
      set뼈대경고(자료.생성?.warning ?? '');
      set원고(null);
    } catch (실패) {
      set뼈대오류(실패 instanceof Error ? 실패.message : '뼈대 생성에 실패했습니다.');
    } finally {
      set뼈대만드는중(false);
    }
  }

  async function 원고쓰기() {
    if (!뼈대 || !선택배정 || !프로필 || 선택배정번호 < 0) return;
    set원고만드는중(true);
    set원고오류('');
    try {
      const 자료 = await 원고만들기({
        뼈대,
        프로필,
        주간: 고른주,
        배정번호: 선택배정번호,
        배정제목: 선택배정.제목,
      });
      set원고({
        산출물: 자료.산출물,
        시간: 자료.시간,
        경고들: [...(자료.구조체?.경고 ?? []), 자료.생성?.warning].filter(Boolean) as string[],
      });
    } catch (실패) {
      set원고오류(실패 instanceof Error ? 실패.message : '원고 생성에 실패했습니다.');
    } finally {
      set원고만드는중(false);
    }
  }

  return (
    <section aria-labelledby="talk-title">
      <div className="mb-6 flex flex-col flex-wrap items-stretch justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold text-brand-dark uppercase">연설 준비</p>
          <h1 id="talk-title" className="text-3xl leading-tight">
            어떤 배정을 준비할까요?
          </h1>
        </div>
        <div
          className={cn(
            판넬,
            'flex min-w-0 flex-col flex-wrap items-stretch gap-3 p-3 shadow-none sm:flex-row sm:items-center',
          )}
        >
          <WeekPicker id="talk-week" 주간들={주간목록에끼워넣기(주간들, 고른주)} 값={고른주} 변경={set고른주} />
        </div>
      </div>

      {설정불러옴 && 프로필 ? (
        <SpeakerProfileForm 프로필={프로필} 변경={프로필고침} />
      ) : (
        <StatusBox>설정을 불러오는 중입니다.</StatusBox>
      )}
      {설정오류 && <StatusBox 경고 역할="alert">{설정오류}</StatusBox>}

      <div className="my-4 grid gap-4">
        {주간오류 && <StatusBox 경고 역할="alert">{주간오류}</StatusBox>}
        {배정오류 && <StatusBox 경고 역할="alert">{배정오류}</StatusBox>}
        {배정안내 && !배정오류 && <StatusBox>{배정안내}</StatusBox>}
        {배정들.length > 0 && (
          <AssignmentCards 배정들={배정들} 선택={선택배정} 고르기={배정고르기} />
        )}
      </div>

      {공개강연인가 && (
        <PublicTalkForm 입력={공개입력} 변경={set공개입력} 위반={검증.통과 ? [] : 검증.위반} />
      )}

      <div className={cn(판넬, 'my-4 flex flex-wrap gap-3 p-3 shadow-none')}>
        <Button
          type="button"
          onClick={뼈대잡기}
          disabled={!뼈대가능 || 뼈대만드는중}
          aria-busy={뼈대만드는중}
          className="min-h-11 px-5 font-bold"
        >
          뼈대 만들기
        </Button>
      </div>
      {뼈대오류 && (
        <StatusBox 경고 역할="alert" className="mb-4">
          {뼈대오류}
        </StatusBox>
      )}

      {뼈대 && (
        <div className="grid gap-4">
          <h2 className="m-0 text-xl">뼈대</h2>
          {뼈대경고 && (
            <StatusBox 경고 역할="status">
              {뼈대경고}
            </StatusBox>
          )}
          <OutlineTable 뼈대={뼈대} 변경={set뼈대} />
          <div className={cn(판넬, 'flex flex-wrap gap-3 p-3 shadow-none')}>
            <Button
              type="button"
              onClick={원고쓰기}
              disabled={원고만드는중}
              aria-busy={원고만드는중}
              className="min-h-11 px-5 font-bold"
            >
              원고 만들기
            </Button>
          </div>
          {원고오류 && (
            <StatusBox 경고 역할="alert">
              {원고오류}
            </StatusBox>
          )}
        </div>
      )}

      {원고 && (
        <div className="mt-4">
          <DraftOutput
            산출물={원고.산출물}
            시간={원고.시간}
            경고들={원고.경고들}
            날짜={고른주}
            배정제목={String(선택배정?.제목 ?? '')}
          />
        </div>
      )}
    </section>
  );
}
