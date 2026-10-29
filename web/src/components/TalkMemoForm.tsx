// 연설 목표와 원고에 넣을 이야기를 받는다. 길이 상한은 서버와 같은 모듈을 쓴다.
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 준비메모상한 } from '~server/talk-input-check.mjs';
import type { 준비메모 } from '@/lib/talk-api';

const 칸 = 'grid gap-1 text-sm font-bold text-ink-muted';
const 판 = 'my-3 grid gap-3 rounded-md border border-line bg-surface p-4';

export default function TalkMemoForm({
  메모,
  변경,
}: {
  메모: 준비메모;
  변경: (다음: 준비메모) => void;
}) {
  return (
    <section aria-labelledby="talk-memo-heading">
      <h2 id="talk-memo-heading" className="mt-6 mb-0 text-xl">
        연설 목표와 들려줄 이야기
      </h2>
      <p className="mt-1 mb-0 text-sm text-ink-muted">
        비워 두어도 됩니다. 적은 사실만 원고에 쓰고 지어내지 않습니다.
      </p>

      <div className={판}>
        <div className={칸}>
          <Label htmlFor="talk-goal">연설 목표</Label>
          <Textarea
            id="talk-goal"
            rows={2}
            maxLength={준비메모상한.목표}
            value={메모.목표}
            onChange={e => 변경({ ...메모, 목표: e.target.value })}
            placeholder="듣는 사람이 무엇을 느끼고 어떻게 하기를 바랍니까?"
            className="min-h-16 resize-y font-normal"
          />
        </div>
        <div className={칸}>
          <Label htmlFor="talk-stories">들려줄 이야기</Label>
          <Textarea
            id="talk-stories"
            rows={5}
            maxLength={준비메모상한.이야기}
            value={메모.이야기}
            onChange={e => 변경({ ...메모, 이야기: e.target.value })}
            placeholder="겪은 일, 회중에서 들은 이야기, 그때 느낀 점을 적으십시오."
            className="min-h-28 resize-y font-normal"
          />
        </div>
      </div>
    </section>
  );
}
