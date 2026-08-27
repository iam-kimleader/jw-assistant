// 카카오 로그인으로 보내는 화면이다.
import { useSearchParams } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import StatusBox, { 판넬 } from '@/components/StatusBox';
import { cn } from '@/lib/utils';

export default function Login() {
  const [질의] = useSearchParams();
  const 오류 = 질의.get('오류');

  return (
    <section aria-labelledby="login-title" className="mx-auto grid max-w-md gap-4">
      <div className={cn(판넬, 'grid gap-4 p-5 text-center')}>
        <h1 id="login-title" className="text-2xl leading-tight">
          로그인이 필요합니다
        </h1>
        <p className="m-0 text-ink-muted">
          카카오 계정으로 들어오시면 준비한 자료가 저장됩니다.
        </p>
        <a
          href="/api/auth-start"
          className={cn(buttonVariants(), 'min-h-11 font-bold')}
        >
          카카오로 로그인
        </a>
      </div>
      {오류 && (
        <StatusBox 경고 역할="alert">
          {오류}
        </StatusBox>
      )}
    </section>
  );
}
