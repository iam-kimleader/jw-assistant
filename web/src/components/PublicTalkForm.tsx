// 일요일 공개강연의 제목과 소제목을 받는다. 검증 규칙은 서버와 같은 모듈을 쓴다.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import StatusBox from './StatusBox';
import type { 공개강연입력 } from '@/lib/talk-api';

const 칸 = 'grid gap-1 text-sm font-bold text-ink-muted';
const 판 =
  'my-3 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded-md border border-line bg-surface p-4';

export default function PublicTalkForm({
  입력,
  변경,
  위반,
}: {
  입력: 공개강연입력;
  변경: (다음: 공개강연입력) => void;
  위반: string[];
}) {
  const 소제목고침 = (i: number, 문장: string) =>
    변경({ ...입력, 소제목: 입력.소제목.map((칸값, j) => (j === i ? { 문장 } : 칸값)) });

  const 제목빔 = !입력.제목.trim();

  return (
    <section aria-labelledby="talk-public-title-heading">
      <h2 id="talk-public-title-heading" className="mt-6 mb-0 text-xl">
        일요일 공개강연 개요
      </h2>

      <div className={판}>
        <div className={칸}>
          <Label htmlFor="talk-public-title">제목</Label>
          <Input
            id="talk-public-title"
            value={입력.제목}
            aria-invalid={제목빔}
            onChange={e => 변경({ ...입력, 제목: e.target.value })}
            className="min-h-11 font-normal aria-invalid:border-destructive"
          />
        </div>
        <div className={칸}>
          <Label htmlFor="talk-public-verse">주제 성구</Label>
          <Input
            id="talk-public-verse"
            value={입력.주제성구}
            placeholder="마태 6:10"
            onChange={e => 변경({ ...입력, 주제성구: e.target.value })}
            className="min-h-11 font-normal"
          />
        </div>
        <div className={칸}>
          <Label htmlFor="talk-public-minutes">배정 시간(분)</Label>
          <Input
            id="talk-public-minutes"
            type="number"
            min={5}
            max={60}
            value={Math.round(입력.배정시간 / 60)}
            onChange={e => 변경({ ...입력, 배정시간: (Number(e.target.value) || 30) * 60 })}
            className="min-h-11 font-normal"
          />
        </div>
      </div>

      <div className={판}>
        {입력.소제목.map((칸값, i) => {
          const 빔 = !칸값.문장.trim();
          return (
            <div key={i} className={칸}>
              <Label htmlFor={`talk-public-point-${i}`}>소제목 {i + 1}</Label>
              <Input
                id={`talk-public-point-${i}`}
                value={칸값.문장}
                aria-invalid={빔}
                onChange={e => 소제목고침(i, e.target.value)}
                className="min-h-11 font-normal aria-invalid:border-destructive"
              />
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="secondary"
        className="min-h-11 font-bold"
        onClick={() => 변경({ ...입력, 소제목: [...입력.소제목, { 문장: '' }] })}
      >
        소제목 칸 추가
      </Button>

      {위반.length > 0 && (
        <StatusBox 경고 역할="alert" className="mt-3">
          {위반.join(' ')}
        </StatusBox>
      )}
    </section>
  );
}
