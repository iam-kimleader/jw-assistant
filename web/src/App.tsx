// 상단 막대와 라우터를 얹는 앱 껍데기다.
import { lazy, Suspense } from 'react';
import { NavLink, Route, Routes } from 'react-router-dom';
import Home from './routes/Home';
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

export default function App() {
  return (
    <>
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
        <nav aria-label="주요 화면" className="flex flex-wrap gap-2">
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
      </header>

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
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
