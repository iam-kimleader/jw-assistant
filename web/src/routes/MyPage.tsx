// 지난 자료를 다시 보고 내 설정을 고치는 마이페이지다.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import SpeakerProfileForm from '@/components/SpeakerProfileForm';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import {
  보관함목록,
  연설지우기,
  type 보관연구답변,
  type 보관연설,
} from '@/lib/archive-api';
import { 보관된연설가져오기, type 프로필 as 프로필형 } from '@/lib/talk-api';
import { 내려받기 } from '@/lib/download';
import { 파일이름 } from '@/lib/talk-format.mjs';
import { use설정 } from '@/lib/use-weeks';
import { cn } from '@/lib/utils';

const 종류이름: Record<보관연구답변['종류'], string> = {
  watchtower: '파수대 연구',
  'life-ministry': '생활과 봉사',
};

const 줄 =
  'flex flex-col gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between';
const 링크단추 =
  'inline-flex min-h-11 items-center rounded-md border border-line px-4 text-sm font-bold text-ink-muted transition-colors hover:bg-surface';

export default function MyPage() {
  const [연구답변, set연구답변] = useState<보관연구답변[]>([]);
  const [연설, set연설] = useState<보관연설[]>([]);
  const [불러오는중, set불러오는중] = useState(true);
  const [오류, set오류] = useState('');
  const [지울것, set지울것] = useState<보관연설 | null>(null);
  const { 설정, 불러옴: 설정불러옴, 설정저장 } = use설정();
  const [설정오류, set설정오류] = useState('');

  useEffect(() => {
    let 살아있음 = true;
    보관함목록().then(
      자료 => {
        if (!살아있음) return;
        set연구답변(자료.연구답변);
        set연설(자료.연설);
        set불러오는중(false);
      },
      실패 => {
        if (!살아있음) return;
        set오류(실패 instanceof Error ? 실패.message : '보관함을 불러오지 못했습니다.');
        set불러오는중(false);
      },
    );
    return () => {
      살아있음 = false;
    };
  }, []);

  function 프로필고침(다음: 프로필형) {
    설정저장(다음).catch(실패 => {
      set설정오류(실패 instanceof Error ? 실패.message : '설정을 저장하지 못했습니다.');
    });
  }

  async function 지우기확정(줄자료: 보관연설) {
    set지울것(null);
    set오류('');
    try {
      await 연설지우기(줄자료.주간, 줄자료.배정번호);
      set연설(이전 =>
        이전.filter(x => !(x.주간 === 줄자료.주간 && x.배정번호 === 줄자료.배정번호)),
      );
    } catch (실패) {
      set오류(실패 instanceof Error ? 실패.message : '연설 자료를 지우지 못했습니다.');
    }
  }

  async function 원고내려받기(줄자료: 보관연설) {
    set오류('');
    try {
      const { 자료 } = await 보관된연설가져오기(줄자료.주간, 줄자료.배정번호, 줄자료.배정제목);
      const 글 = 자료?.원고?.산출물?.준비원고 ?? '';
      if (!글) {
        set오류('아직 원고가 없습니다. 뼈대만 만들어 둔 자료입니다.');
        return;
      }
      내려받기(파일이름(줄자료.주간, 줄자료.배정제목 || '연설', '준비원고'), 글);
    } catch (실패) {
      set오류(실패 instanceof Error ? 실패.message : '원고를 불러오지 못했습니다.');
    }
  }

  return (
    <>
      <h1 className="mb-1 text-2xl">마이페이지</h1>
      <p className="mb-6 text-ink-muted">지난 자료를 다시 보고 설정을 고칩니다.</p>

      {오류 && (
        <StatusBox 경고 역할="alert" className="mb-6">
          {오류}
        </StatusBox>
      )}

      <h2 className="mb-2 text-lg">연구 답변</h2>
      <p className="mb-3 text-sm text-ink-muted">
        회중이 함께 쓰는 자료입니다. 누가 만들었는지는 남기지 않으므로 저장된 주간을 모두
        보여 줍니다.
      </p>
      <div className={cn(판넬, 'mb-8')}>
        {불러오는중 && <p className="px-5 py-4 text-ink-muted">불러오는 중입니다.</p>}
        {!불러오는중 && 연구답변.length === 0 && (
          <p className="px-5 py-4 text-ink-muted">아직 저장된 답변이 없습니다.</p>
        )}
        {연구답변.map(항목 => (
          <div key={`${항목.종류}-${항목.주간}`} className={줄}>
            <span>
              <b>{항목.주간}</b> · {종류이름[항목.종류]}
            </span>
            <Link to={`/${항목.종류}?date=${항목.주간}`} className={cn(링크단추, 'shrink-0')}>
              보기
            </Link>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-lg">연설 자료</h2>
      <p className="mb-3 text-sm text-ink-muted">내가 만든 것만 보입니다.</p>
      <div className={cn(판넬, 'mb-8')}>
        {불러오는중 && <p className="px-5 py-4 text-ink-muted">불러오는 중입니다.</p>}
        {!불러오는중 && 연설.length === 0 && (
          <p className="px-5 py-4 text-ink-muted">아직 저장된 연설 자료가 없습니다.</p>
        )}
        {연설.map(항목 => (
          <div key={`${항목.주간}-${항목.배정번호}`} className={줄}>
            <span>
              <b>{항목.주간}</b> · {항목.배정제목 || '제목 없음'}
              {항목.만든때 && (
                <span className="text-sm text-ink-muted"> · {항목.만든때.slice(0, 10)} 에 만듦</span>
              )}
            </span>
            <span className="flex shrink-0 flex-wrap gap-2">
              <Link
                to={`/talk?주간=${항목.주간}&배정번호=${항목.배정번호}`}
                className={링크단추}
              >
                보기
              </Link>
              <Button
                variant="outline"
                className="min-h-11"
                type="button"
                onClick={() => 원고내려받기(항목)}
              >
                내려받기
              </Button>
              <Button
                variant="outline"
                className="min-h-11"
                type="button"
                onClick={() => set지울것(항목)}
              >
                지우기
              </Button>
            </span>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-lg">설정</h2>
      <p className="mb-3 text-sm text-ink-muted">
        연설 자료를 만들 때 여기 값이 처음부터 골라져 있습니다.
      </p>
      {설정오류 && (
        <StatusBox 경고 역할="alert" className="mb-3">
          {설정오류}
        </StatusBox>
      )}
      {설정불러옴 && 설정 ? (
        <SpeakerProfileForm 프로필={설정} 변경={프로필고침} />
      ) : (
        <StatusBox>설정을 불러오는 중입니다.</StatusBox>
      )}

      <AlertDialog open={지울것 !== null} onOpenChange={열림 => !열림 && set지울것(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 연설 자료를 지울까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {지울것 ? `${지울것.주간} · ${지울것.배정제목 || '제목 없음'}` : ''} 의 뼈대와 원고가
              사라집니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">그만두기</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 font-bold"
              onClick={() => 지울것 && 지우기확정(지울것)}
            >
              지우기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
