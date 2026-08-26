// 어떤 준비를 할지 고르는 첫 화면이다.
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

type 서비스 = { 경로?: string; 머리말: string; 이름: string; 설명: string };

const 서비스목록: 서비스[] = [
  {
    경로: '/life-ministry',
    머리말: '주중 집회',
    이름: '생활과 봉사',
    설명: '영적 보물 찾기와 회중 성서 연구를 준비합니다.',
  },
  {
    경로: '/watchtower',
    머리말: '주말 집회',
    이름: '파수대 연구',
    설명: '항별 질문에 대한 답변 초안을 준비합니다.',
  },
  { 머리말: '준비 중', 이름: '개인 연구', 설명: '추후 추가 예정입니다.' },
  { 머리말: '준비 중', 이름: '봉사인도', 설명: '추후 추가 예정입니다.' },
  {
    경로: '/talk',
    머리말: '연설 준비',
    이름: '연설',
    설명: '그 주 배정과 공개강연 개요로 원고를 준비합니다.',
  },
];

// 누를 수 있는 카드와 준비 중 카드가 같은 모양이어야 해서 클래스를 한곳에 둔다.
const 카드공통 = 'grid min-h-48 content-start gap-3 rounded-md border p-5 text-left';

function 카드내용({ 머리말, 이름, 설명, 잠김 }: 서비스 & { 잠김?: boolean }) {
  return (
    <>
      <span className={cn('text-xs font-bold', 잠김 ? 'text-inherit' : 'text-gold-text')}>
        {머리말}
      </span>
      <strong className="text-xl leading-tight">{이름}</strong>
      <span className={cn(잠김 ? 'text-inherit' : 'text-ink-muted')}>{설명}</span>
    </>
  );
}

export default function Home() {
  return (
    <section aria-labelledby="home-title">
      <div className="mb-6">
        <p className="mb-2 text-xs font-bold text-brand-dark uppercase">JW Assistant</p>
        <h1 id="home-title" className="text-3xl leading-tight">
          어떤 연구를 준비할까요?
        </h1>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-4">
        {서비스목록.map(서비스 =>
          서비스.경로 ? (
            <Link
              key={서비스.이름}
              to={서비스.경로}
              className={cn(
                카드공통,
                'border-line bg-surface shadow-panel transition-colors hover:border-brand',
              )}
            >
              <카드내용 {...서비스} />
            </Link>
          ) : (
            <div
              key={서비스.이름}
              aria-disabled="true"
              className={cn(카드공통, 'border-line bg-[#eef1f4] text-[#656d76]')}
            >
              <카드내용 {...서비스} 잠김 />
            </div>
          ),
        )}
      </div>
    </section>
  );
}
