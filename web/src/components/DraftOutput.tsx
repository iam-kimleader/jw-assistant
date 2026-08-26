// 완성된 원고를 네 가지 산출물 탭으로 보여 주고 복사·내려받기를 붙인다.
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import StatusBox, { 판넬 } from './StatusBox';
import { 클립보드에쓰기 } from '@/lib/clipboard';
import { 파일이름, 시간요약 } from '@/lib/talk-format.mjs';
import { 산출물목록, 산출물이름, type 산출물키, type 시간정보 } from '@/lib/talk-api';
import { cn } from '@/lib/utils';

function 내려받기(이름: string, 본문: string) {
  const blob = new Blob([본문], { type: 'text/markdown;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 이름;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function DraftOutput({
  산출물,
  시간,
  경고들,
  날짜,
  배정제목,
}: {
  산출물: Record<산출물키, string>;
  시간: 시간정보;
  경고들: string[];
  날짜: string;
  배정제목: string;
}) {
  const [탭, set탭] = useState<산출물키>('준비원고');
  const [복사됨, set복사됨] = useState(false);
  const 타이머 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(타이머.current), []);

  async function 복사하기() {
    await 클립보드에쓰기(산출물[탭] || '');
    set복사됨(true);
    clearTimeout(타이머.current);
    타이머.current = setTimeout(() => set복사됨(false), 1_300);
  }

  const 요약 = 시간요약(시간);

  return (
    <div className="grid gap-4">
      <Tabs value={탭} onValueChange={값 => set탭(값 as 산출물키)}>
        <TabsList className="flex-wrap">
          {산출물목록.map(키 => (
            <TabsTrigger key={키} value={키} className="min-h-11">
              {산출물이름[키]}
            </TabsTrigger>
          ))}
        </TabsList>

        {경고들.length > 0 && (
          <StatusBox 경고 역할="status" className="mt-4">
            {경고들.join(' ')}
          </StatusBox>
        )}

        {요약 && (
          <StatusBox 경고={요약.경고} 역할="status" className="mt-4">
            {요약.글}
          </StatusBox>
        )}

        {산출물목록.map(키 => (
          <TabsContent key={키} value={키} className="mt-4">
            <pre
              tabIndex={0}
              className={cn(판넬, 'm-0 px-5 py-4 font-sans break-words whitespace-pre-wrap')}
            >
              {산출물[키] || ''}
            </pre>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={복사하기} className="min-h-11 font-bold">
          {복사됨 ? '복사 완료' : '복사'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => 내려받기(파일이름(날짜, 배정제목 || '연설', 탭), 산출물[탭] || '')}
          className="min-h-11 font-bold"
        >
          내려받기
        </Button>
      </div>
    </div>
  );
}
