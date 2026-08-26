// 그 주 배정을 카드로 늘어놓는다. 자격이 안 되는 배정은 사유와 함께 잠근다.
import { 분초표시 } from '@/lib/talk-format.mjs';
import { cn } from '@/lib/utils';
import type { 배정 } from '@/lib/talk-api';

const 카드공통 = 'grid min-h-48 content-start gap-3 rounded-md border border-line p-5 text-left';

function 카드속({ 배정: 값 }: { 배정: 배정 }) {
  return (
    <>
      <span className={cn('text-xs font-bold', 값.가능 ? 'text-gold-text' : 'text-inherit')}>
        {값.절}
      </span>
      <strong className="text-xl leading-tight">{값.제목}</strong>
      <span className={cn(값.가능 ? 'text-ink-muted' : 'text-inherit')}>
        {값.설명 || 값.봉사형태 || `${분초표시(값.시간초)} 배정`}
      </span>
      {!값.가능 && 값.사유 && <span className="text-xs text-maroon">{값.사유}</span>}
    </>
  );
}

export default function AssignmentCards({
  배정들,
  선택,
  고르기,
}: {
  배정들: 배정[];
  선택: 배정 | null;
  고르기: (값: 배정) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
      {배정들.map((값, i) =>
        값.가능 ? (
          <button
            key={`${값.절}-${값.제목}-${i}`}
            type="button"
            onClick={() => 고르기(값)}
            aria-pressed={선택 === 값}
            className={cn(
              카드공통,
              'bg-surface shadow-panel transition-colors hover:border-brand',
              선택 === 값 && 'border-brand shadow-[inset_0_0_0_2px_var(--color-brand)]',
            )}
          >
            <카드속 배정={값} />
          </button>
        ) : (
          <div
            key={`${값.절}-${값.제목}-${i}`}
            aria-disabled="true"
            className={cn(카드공통, 'bg-[#eef1f4] text-[#656d76]')}
          >
            <카드속 배정={값} />
          </div>
        ),
      )}
    </div>
  );
}
