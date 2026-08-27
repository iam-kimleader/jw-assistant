// 처음 들어온 사람에게 초대 코드를 받는 화면이다.
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import { cn } from '@/lib/utils';

export default function Invite() {
  const [코드, set코드] = useState('');
  const [오류, set오류] = useState('');
  const [보내는중, set보내는중] = useState(false);

  async function 확인하기() {
    set보내는중(true);
    set오류('');
    try {
      const 응답 = await fetch('/api/auth-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 코드 }),
      });
      const 자료 = await 응답.json();
      if (!응답.ok) throw new Error(자료?.error ?? '확인에 실패했습니다.');
      // 세션 쿠키가 방금 생겼다. 통째로 다시 읽어 들이는 편이 확실하다.
      window.location.assign('/');
    } catch (실패) {
      set오류(실패 instanceof Error ? 실패.message : '확인에 실패했습니다.');
      set보내는중(false);
    }
  }

  return (
    <section aria-labelledby="invite-title" className="mx-auto grid max-w-md gap-4">
      <div className={cn(판넬, 'grid gap-4 p-5')}>
        <h1 id="invite-title" className="text-2xl leading-tight">
          초대 코드를 넣어 주십시오
        </h1>
        <p className="m-0 text-ink-muted">
          처음 오셨습니다. 회중에서 받으신 코드를 넣으시면 다음부터는 바로 들어오십니다.
        </p>
        <div className="grid gap-1">
          <Label htmlFor="invite-code" className="text-sm font-bold text-ink-muted">
            초대 코드
          </Label>
          <Input
            id="invite-code"
            value={코드}
            onChange={e => set코드(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && 코드.trim() && 확인하기()}
            className="min-h-11"
          />
        </div>
        <Button
          type="button"
          onClick={확인하기}
          disabled={보내는중 || !코드.trim()}
          aria-busy={보내는중}
          className="min-h-11 font-bold"
        >
          확인
        </Button>
      </div>
      {오류 && (
        <StatusBox 경고 역할="alert">
          {오류}
        </StatusBox>
      )}
    </section>
  );
}
