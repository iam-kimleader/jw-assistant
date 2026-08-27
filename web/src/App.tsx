// 상단 막대와 라우터를 얹는 앱 껍데기다.
import { lazy, Suspense, useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Home from './routes/Home';
import Login from './routes/Login';
import Invite from './routes/Invite';
import { 로그인필요오류 } from '@/lib/api';
import { 한번만가져오기 } from '@/lib/use-weeks';
import { cn } from '@/lib/utils';

// 홈만 처음에 받고 나머지는 그 화면에 들어갈 때 받는다. 첫 화면이 가벼워진다.
const StudyPrep = lazy(() => import('./routes/StudyPrep'));
const Talk = lazy(() => import('./routes/Talk'));

const 화면 = [
  { 경로: '/', 이름: '홈' },
  { 경로: '/life-ministry', 이름: '생활과 봉사' },
  { 경로: '/watchtower', 이름: '파수대 연구' },
  { 경로: '/talk', 이름: '연설' },
];

// 상단 막대와 내비 자체를 따로 떼어 둔다. 로그인 확인이 끝나기 전에는 App 이 이걸 그리지
// 않으므로, 스모크에서 이 컴포넌트를 직접 그려야 상단 막대가 실제로 마운트되는지 알 수 있다.
export function 상단바({ 사용자 }: { 사용자: { 닉네임: string } | null }) {
  return (
    <header
      data-topbar
      className="flex min-h-16 flex-col items-stretch justify-between gap-6 border-b-4 border-brand bg-topbar px-4 py-4 text-white md:flex-row md:items-center md:px-8 md:py-0"
    >
      <div className="flex items-center gap-3 font-bold">
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full bg-white text-xs text-topbar"
        >
          JW
        </span>
        <span>성경 연구 도우미</span>
      </div>
      <nav aria-label="주요 화면" className="flex flex-wrap items-center gap-2">
        {화면.map(({ 경로, 이름 }) => (
          <NavLink
            key={경로}
            to={경로}
            end={경로 === '/'}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center rounded px-3 text-white/80 transition-colors hover:bg-white/12 hover:text-white',
                isActive && 'bg-white/12 text-white',
              )
            }
          >
            {이름}
          </NavLink>
        ))}
      </nav>
      {사용자 && (
        <div className="flex items-center gap-3">
          <span className="text-sm">{사용자.닉네임 || '형제'}</span>
          <button
            type="button"
            className="min-h-11 rounded px-3 text-white/80 hover:bg-white/12 hover:text-white"
            onClick={async () => {
              await fetch('/api/auth-logout', { method: 'POST' });
              window.location.assign('/login');
            }}
          >
            로그아웃
          </button>
        </div>
      )}
    </header>
  );
}

export default function App() {
  const [사용자, set사용자] = useState<{ 닉네임: string } | null>(null);
  const [확인중, set확인중] = useState(true);
  const 위치 = useLocation();

  useEffect(() => {
    let 살아있음 = true;
    한번만가져오기().then(
      자료 => {
        if (살아있음) {
          set사용자(자료.사용자);
          set확인중(false);
        }
      },
      실패 => {
        if (!살아있음) return;
        set사용자(null);
        set확인중(false);
        if (!(실패 instanceof 로그인필요오류)) console.error(실패);
      },
    );
    return () => {
      살아있음 = false;
    };
  }, []);

  const 열린화면 = 위치.pathname === '/login' || 위치.pathname === '/invite';
  if (확인중) return <p role="status" className="p-8">확인하는 중입니다.</p>;
  if (!사용자 && !열린화면) return <Navigate to="/login" replace />;

  return (
    <>
      <상단바 사용자={사용자} />

      <main className="mx-auto w-[min(1180px,100%-1.25rem)] pt-6 pb-16 md:w-[min(1180px,100%-2rem)] md:pt-8">
        <Suspense fallback={<p role="status">화면을 불러오는 중입니다.</p>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route
              path="/life-ministry"
              element={<StudyPrep 종류="life-ministry" 머리말="생활과 봉사" 제목="주간 교재 준비" />}
            />
            <Route
              path="/watchtower"
              element={<StudyPrep 종류="watchtower" 머리말="파수대 연구" 제목="항별 답변 준비" />}
            />
            <Route path="/talk" element={<Talk />} />
            <Route path="/login" element={<Login />} />
            <Route path="/invite" element={<Invite />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
