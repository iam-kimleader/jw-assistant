// 생활과 봉사와 파수대 연구는 화면이 같고 부르는 API 만 다르다. 한 컴포넌트로 둘 다 그린다.
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import PreparationProgress from '@/components/PreparationProgress';
import SavedNotice from '@/components/SavedNotice';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import StudyResult from '@/components/StudyResult';
import WeekPicker from '@/components/WeekPicker';
import { 준비자료, 다시만들기 as 다시만들기호출, type 준비결과, type 준비종류 } from '@/lib/api';
import { useSearchParams } from 'react-router-dom';
import { use주간목록, 주간목록에끼워넣기 } from '@/lib/use-weeks';
import { cn } from '@/lib/utils';

type 진행상태 = '대기' | '준비중' | '마무리' | '완료' | '실패';

export default function StudyPrep({
  종류,
  머리말,
  제목,
}: {
  종류: 준비종류;
  머리말: string;
  제목: string;
}) {
  const { 주간들, 현재주, 오류: 주간오류 } = use주간목록();
  const [질의] = useSearchParams();
  const 청한주 = 질의.get('date') ?? '';
  const [고른주, set고른주] = useState('');
  const [상태, set상태] = useState<진행상태>('대기');
  const [자료, set자료] = useState<준비결과 | null>(null);
  const [오류, set오류] = useState('');
  const [다시만드는중, set다시만드는중] = useState(false);
  const [다시만들기오류, set다시만들기오류] = useState('');

  // 보관함에서 왔으면 그 주간으로 연다. 아니면 이번 주다.
  useEffect(() => {
    if (고른주) return;
    if (청한주) set고른주(청한주);
    else if (현재주) set고른주(현재주);
  }, [현재주, 청한주, 고른주]);

  // 화면을 옮겨 다녀도 이전 결과가 남지 않도록 종류가 바뀌면 비운다.
  useEffect(() => {
    set상태('대기');
    set자료(null);
    set오류('');
    set다시만드는중(false);
    set다시만들기오류('');
  }, [종류]);

  async function 준비하기() {
    set상태('준비중');
    set자료(null);
    set오류('');
    try {
      const 받은자료 = await 준비자료(종류, 고른주);
      // 게이지를 100 까지 올린 뒤 잠깐 두고 결과로 넘어간다.
      set상태('마무리');
      await new Promise(resolve => setTimeout(resolve, 300));
      set자료(받은자료);
      set상태('완료');
    } catch (실패) {
      set오류(실패 instanceof Error ? 실패.message : '요청에 실패했습니다.');
      set상태('실패');
    }
  }

  async function 다시만들어보기() {
    set다시만드는중(true);
    set다시만들기오류('');
    try {
      set자료(await 다시만들기호출(종류, 고른주));
    } catch (실패) {
      // 기존 답변은 그대로 둔다. 다시 만들지 못한 것이지 있던 것이 사라진 것은 아니다.
      set다시만들기오류(실패 instanceof Error ? 실패.message : '다시 만들지 못했습니다.');
    } finally {
      set다시만드는중(false);
    }
  }

  const 준비중 = 상태 === '준비중' || 상태 === '마무리';

  return (
    <section aria-labelledby={`${종류}-title`}>
      <div className="mb-6 flex flex-col flex-wrap items-stretch justify-between gap-6 md:flex-row md:items-end">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold text-brand-dark uppercase">{머리말}</p>
          <h1 id={`${종류}-title`} className="text-3xl leading-tight">
            {제목}
          </h1>
        </div>
        <div
          className={cn(
            판넬,
            'flex min-w-0 flex-col flex-wrap items-stretch gap-3 p-3 shadow-none sm:flex-row sm:items-center',
          )}
        >
          <WeekPicker id={`${종류}-week`} 주간들={주간목록에끼워넣기(주간들, 고른주)} 값={고른주} 변경={set고른주} />
          <Button
            type="button"
            onClick={준비하기}
            disabled={준비중 || !고른주}
            aria-busy={준비중}
            className="min-h-11 px-5 font-bold"
          >
            준비
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {주간오류 && <StatusBox 경고 역할="alert">{주간오류}</StatusBox>}
        {상태 === '대기' && !주간오류 && <StatusBox>주간을 선택한 뒤 준비를 누르세요.</StatusBox>}
        {준비중 && <PreparationProgress 완료됨={상태 === '마무리'} />}
        {상태 === '실패' && (
          <StatusBox 경고 역할="alert">
            {오류}
          </StatusBox>
        )}
        {상태 === '완료' && 자료 && (
          <>
            {자료.보관 && !자료.보관.새로만듦 && (
              <SavedNotice
                만든때={자료.보관.만든때}
                다시만드는중={다시만드는중}
                다시만들기={다시만들어보기}
              />
            )}
            {다시만들기오류 && (
              <StatusBox 경고 역할="alert">
                {다시만들기오류} 기존 답변은 그대로 있습니다.
              </StatusBox>
            )}
            <StudyResult 자료={자료} />
          </>
        )}
      </div>
    </section>
  );
}
