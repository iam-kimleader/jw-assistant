// 답변 생성이 오래 걸리는 동안 예상 진행률을 원형 게이지로 보여 준다.
import { useEffect, useState } from 'react';
import { estimatePreparationProgress } from '../../progress.js';
import { 판넬 } from './StatusBox';
import { cn } from '@/lib/utils';

export default function PreparationProgress({ 완료됨 = false }: { 완료됨?: boolean }) {
  const [진행률, set진행률] = useState(() => estimatePreparationProgress(0));

  useEffect(() => {
    if (완료됨) {
      set진행률(100);
      return;
    }
    const 시작 = Date.now();
    const 타이머 = setInterval(() => set진행률(estimatePreparationProgress(Date.now() - 시작)), 1_000);
    return () => clearInterval(타이머);
  }, [완료됨]);

  const 값 = Math.max(0, Math.min(100, Math.round(진행률)));

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(판넬, 'flex items-center justify-between gap-4 px-5 py-4 text-ink-muted')}
    >
      <div className="grid gap-1">
        <strong className="text-base text-ink">답변을 준비하고 있습니다.</strong>
        <span className="text-xs">예상 진행률</span>
      </div>
      <div
        role="progressbar"
        aria-label="답변 준비 예상 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={값}
        aria-valuetext={`예상 진행률 ${값}퍼센트`}
        className="relative grid size-12 shrink-0 place-items-center rounded-full"
        style={{ background: `conic-gradient(var(--color-brand) ${값 * 3.6}deg, #dfe4e8 0deg)` }}
      >
        <span className="absolute size-9 rounded-full bg-surface" />
        <span className="relative text-xs font-bold text-brand-dark">{값}%</span>
      </div>
    </div>
  );
}
