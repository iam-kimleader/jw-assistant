// 질문 하나와 그 답변, 참고 출판물, 성구를 담는 카드다.
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { 판넬 } from './StatusBox';
import { 클립보드에쓰기 } from '@/lib/clipboard';
import { cn } from '@/lib/utils';
import type { 답변 as 답변형, 참고출판물 as 참고출판물형, 성구묶음 } from '@/lib/api';

// 클립보드에는 답변 본문만 넣는다. 질문과 성구는 넣지 않는다.
export function 복사할글(답변: 답변형) {
  return 답변.답변;
}

function 참고출판물목록({ 목록 }: { 목록: 참고출판물형[] }) {
  if (!목록.length) return null;
  return (
    <div className="mb-4 grid gap-2 border-l-4 border-l-gold bg-[#fffaf0] px-4 py-3">
      <strong className="text-sm text-[#4c5157]">참고 출판물</strong>
      {목록.map((참고, i) => {
        const 자세히 = [참고.제목, 참고.출판물].filter(Boolean).join(' · ');
        return (
          <div key={`${참고.url ?? 참고.원문URL ?? i}`} className="grid gap-1">
            <a
              href={참고.url || 참고.원문URL}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit font-bold text-brand-dark underline underline-offset-2"
            >
              {참고.표시 || 참고.제목 || 'WOL 참고 자료'}
            </a>
            {자세히 && <span className="text-xs text-[#626970]">{자세히}</span>}
          </div>
        );
      })}
    </div>
  );
}

function 성구목록({ 목록 }: { 목록: 성구묶음[] }) {
  if (!목록.length) return null;
  return (
    <div className="grid gap-3">
      {목록.map((묶음, i) => (
        <div
          key={`${묶음.라벨}-${i}`}
          className="border-l-4 border-l-brand bg-[#f7f9fb] p-3 leading-relaxed"
        >
          <strong className="mb-1 block">{묶음.낭독 ? `${묶음.라벨} 낭독` : 묶음.라벨}</strong>
          {묶음.본문.map(절 => (
            <p key={절.주소} className="mt-0 mb-0">
              {절.주소} {절.본문}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}

export default function AnswerCard({ 답변 }: { 답변: 답변형 }) {
  const [복사됨, set복사됨] = useState(false);
  const 타이머 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(타이머.current), []);

  async function 복사하기() {
    await 클립보드에쓰기(복사할글(답변));
    set복사됨(true);
    clearTimeout(타이머.current);
    타이머.current = setTimeout(() => set복사됨(false), 1_300);
  }

  return (
    <article className={cn(판넬, 'p-5')}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <span className="mb-1 inline-block text-xs font-bold text-gold-text">
            {답변.문단번호?.length ? `${답변.문단번호.join(', ')}문단` : 답변.번호}
          </span>
          <h3 className="m-0 text-lg leading-normal">{답변.질문}</h3>
        </div>
        <Button
          type="button"
          variant="secondary"
          title="답변만 클립보드에 복사"
          onClick={복사하기}
          className={cn(
            'min-h-11 min-w-23 shrink-0 font-bold',
            복사됨 && 'bg-[#e7f3ec] text-[#23643a]',
          )}
        >
          {복사됨 ? '복사 완료' : '답변 복사'}
        </Button>
      </div>

      <p className="mt-0 mb-4 border-l-4 border-l-answer-line bg-answer-bg px-4 py-3 leading-relaxed">
        {답변.답변}
      </p>

      <참고출판물목록 목록={답변.참고출판물 ?? []} />
      <성구목록 목록={답변.성구 ?? []} />
    </article>
  );
}
