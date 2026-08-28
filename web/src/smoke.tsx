// 모든 화면이 예외 없이 마운트되는지 확인하고 그려진 표시를 출력한다. `npm run smoke:web` 으로 돈다.
import type { ReactElement } from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import App, { 상단바 } from './App';
import SavedNotice from './components/SavedNotice';
import SpeakerProfileForm from './components/SpeakerProfileForm';
import Home from './routes/Home';
import StudyPrep from './routes/StudyPrep';
import Talk from './routes/Talk';
import Login from './routes/Login';
import { 기본프로필 } from '~server/talk-profile.mjs';
import type { 프로필 as 프로필형 } from './lib/talk-api';

// App 은 라우트를 lazy 로 받으므로 화면 본체를 직접 그려야 진짜로 마운트된다.
// 이름은 보고용이고 경로는 라우터에 넘기는 값이다. 둘을 섞으면 MemoryRouter 가 못 알아본다.
// App 은 로그인 확인이 끝나기 전엔 "확인하는 중입니다" 한 줄만 그린다(useEffect 는
// renderToString 에서 돌지 않는다). 그래서 상단 막대·내비는 App 이 아니라 상단바를
// 직접 그려야 실제로 마운트되는지 확인할 수 있다.
const 화면들: { 이름: string; 경로: string; 화면: ReactElement }[] = [
  { 이름: '껍데기(로그인 확인 중)', 경로: '/', 화면: <App /> },
  { 이름: '껍데기(상단 막대·내비)', 경로: '/', 화면: <상단바 사용자={{ 닉네임: '스모크' }} /> },
  { 이름: '홈', 경로: '/', 화면: <Home /> },
  {
    이름: '생활과 봉사',
    경로: '/life-ministry',
    화면: <StudyPrep 종류="life-ministry" 머리말="생활과 봉사" 제목="주간 교재 준비" />,
  },
  {
    이름: '파수대 연구',
    경로: '/watchtower',
    화면: <StudyPrep 종류="watchtower" 머리말="파수대 연구" 제목="항별 답변 준비" />,
  },
  { 이름: '연설', 경로: '/talk', 화면: <Talk /> },
  {
    이름: '화자 설정 폼',
    경로: '/talk',
    화면: <SpeakerProfileForm 프로필={기본프로필() as 프로필형} 변경={() => {}} />,
  },
  {
    이름: '저장 안내 띠',
    경로: '/watchtower',
    화면: (
      <SavedNotice 만든때="2026-08-26T00:00:00.000Z" 다시만드는중={false} 다시만들기={() => {}} />
    ),
  },
  { 이름: '로그인', 경로: '/login', 화면: <Login /> },
];

let 실패 = 0;
for (const { 이름, 경로, 화면 } of 화면들) {
  try {
    const html = renderToString(<MemoryRouter initialEntries={[경로]}>{화면}</MemoryRouter>);
    console.log(`\n===== ${이름} · 렌더 성공 · ${html.length}자`);
    console.log(html);
  } catch (e) {
    실패 += 1;
    console.log(`\n===== ${이름} · 렌더 실패`);
    console.log(e instanceof Error ? e.stack : String(e));
  }
}

console.log(`\n===== 실패 ${실패}건`);
if (실패 > 0) process.exit(1);
