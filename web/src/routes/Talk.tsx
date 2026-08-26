// 배정을 고르고 뼈대를 잡아 원고까지 만드는 연설 준비 화면이다.
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  뼈대만들기,
  원고만들기,
  type 공개강연입력,
  type 배정,
  type 산출물키,
  type 시간정보,
  type 뼈대 as 뼈대형,
} from '@/lib/talk-api';
import { 기본값, 프로필읽기, 프로필쓰기 } from '@/lib/talk-profile-store';
import { use주간목록 } from '@/lib/use-weeks';
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
  const [고른주, set고른주] = useState('');
  const [프로필, set프로필] = useState(기본값);

  const [배정들, set배정들] = useState<배정[]>([]);
  const [배정안내, set배정안내] = useState('주간을 선택하세요.');
  const [배정오류, set배정오류] = useState('');
  const [선택배정, set선택배정] = useState<배정 | null>(null);

  const [공개입력, set공개입력] = useState<공개강연입력>(빈공개강연);

  const [뼈대, set뼈대] = useState<뼈대형 | null>(null);
  const [뼈대경고, set뼈대경고] = useState('');
  const [뼈대오류, set뼈대오류] = useState('');
  const [뼈대만드는중, set뼈대만드는중] = useState(false);

  const [원고, set원고] = useState<원고결과 | null>(null);
  const [원고오류, set원고오류] = useState('');
  const [원고만드는중, set원고만드는중] = useState(false);

  useEffect(() => {
    set프로필(프로필읽기());
  }, []);

  useEffect(() => {
    if (현재주 && !고른주) set고른주(현재주);
  }, [현재주, 고른주]);

  const 산출물초기화 = useCallback(() => {
    set뼈대(null);
    set뼈대경고('');
    set뼈대오류('');
    set원고(null);
    set원고오류('');
  }, []);

  // 자격판정은 성별과 임명만 본다. 나머지 항목까지 걸면 글자 하나 칠 때마다 API 를 두드리게 된다.
  const { 성별, 임명 } = 프로필;

  useEffect(() => {
    if (!고른주) return;
    let 살아있음 = true;
    set배정안내('배정을 불러오는 중입니다.');
    set배정오류('');
    set선택배정(null);
    산출물초기화();

    배정가져오기(고른주, { ...프로필읽기(), 성별, 임명 }).then(
      자료 => {
        if (!살아있음) return;
        set배정들([...자료.배정, 자료.공개강연카드].filter(Boolean) as 배정[]);
        set배정안내('');
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
  }, [고른주, 성별, 임명, 산출물초기화]);

  function 프로필고침(다음: typeof 프로필) {
    set프로필(다음);
    프로필쓰기(다음);
  }

  function 배정고르기(값: 배정) {
    set선택배정(값);
    산출물초기화();
  }

  const 공개강연인가 = 선택배정?.종류 === '공개강연';
  const 검증 = useMemo(() => 공개강연입력검증(공개입력), [공개입력]) as {
    통과: boolean;
    위반: string[];
  };
  const 뼈대가능 = Boolean(선택배정) && (!공개강연인가 || 검증.통과);

  async function 뼈대잡기() {
    if (!선택배정) return;
    set뼈대만드는중(true);
    set뼈대오류('');
    try {
      const 자료 = await 뼈대만들기({
        배정: 선택배정,
        프로필,
        ...(공개강연인가 ? { 공개강연입력: 공개입력 } : {}),
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
    if (!뼈대) return;
    set원고만드는중(true);
    set원고오류('');
    try {
      const 자료 = await 원고만들기({ 뼈대, 프로필 });
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
      <div className="mb-6 flex flex-col items-stretch justify-between gap-6 md:flex-row md:items-end">
        <div>
          <p className="mb-2 text-xs font-bold text-brand-dark uppercase">연설 준비</p>
          <h1 id="talk-title" className="text-3xl leading-tight">
            어떤 배정을 준비할까요?
          </h1>
        </div>
        <div
          className={cn(
            판넬,
            'flex flex-col items-stretch gap-3 p-3 shadow-none sm:flex-row sm:items-center',
          )}
        >
          <WeekPicker id="talk-week" 주간들={주간들} 값={고른주} 변경={set고른주} />
        </div>
      </div>

      <SpeakerProfileForm 프로필={프로필} 변경={프로필고침} />

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
