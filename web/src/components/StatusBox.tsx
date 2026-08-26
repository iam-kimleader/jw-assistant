// 안내와 경고를 같은 모양의 상자로 보여 준다.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const 판넬 = 'rounded-md border border-line bg-surface shadow-panel';

export default function StatusBox({
  경고 = false,
  역할,
  className,
  children,
}: {
  경고?: boolean;
  역할?: 'alert' | 'status';
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      role={역할}
      className={cn(판넬, 'px-5 py-4 text-ink-muted', 경고 && 'border-l-4 border-l-gold', className)}
    >
      {children}
    </div>
  );
}
