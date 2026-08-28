// 저장된 자료임을 알리고 다시 만들 수 있게 한다. 다시 만들면 회중 모두의 것이 바뀐다.
import { useState } from 'react';
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
import { 판넬 } from '@/components/StatusBox';
import { cn } from '@/lib/utils';

export default function SavedNotice({
  만든때,
  다시만드는중,
  다시만들기,
}: {
  만든때: string | null;
  다시만드는중: boolean;
  다시만들기: () => void;
}) {
  const [열림, set열림] = useState(false);
  const 날짜 = 만든때 ? 만든때.slice(0, 10) : null;

  return (
    <div
      className={cn(
        판넬,
        'flex flex-col items-stretch gap-3 px-5 py-4 text-ink-muted sm:flex-row sm:items-center sm:justify-between',
      )}
      role="status"
    >
      <span>{날짜 ? `${날짜} 에 만들어진 답변입니다.` : '이미 만들어져 있던 답변입니다.'}</span>
      <Button
        type="button"
        variant="outline"
        onClick={() => set열림(true)}
        disabled={다시만드는중}
        aria-busy={다시만드는중}
        className="min-h-11 shrink-0 font-bold"
      >
        다시 만들기
      </Button>

      <AlertDialog open={열림} onOpenChange={set열림}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>다시 만들까요?</AlertDialogTitle>
            <AlertDialogDescription>
              이번 주 답변이 이미 있습니다. 다시 만들면 이전 답변은 사라지고, 회중의 다른 분들께도
              새 답변이 보이게 됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">그만두기</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 font-bold"
              onClick={() => {
                set열림(false);
                다시만들기();
              }}
            >
              다시 만들기
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
