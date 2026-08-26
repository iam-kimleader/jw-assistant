// 화자 정보를 입력받는다. 값이 바뀌면 자격에 따라 배정 목록이 다시 그려진다.
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { 스타일목록, 임명목록 } from '~server/talk-profile.mjs';
import type { 프로필 } from '@/lib/talk-api';

const 칸 = 'grid gap-1 text-sm font-bold text-ink-muted';
const 판 =
  'my-3 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 rounded-md border border-line bg-surface p-4';

function 고르기({
  id,
  이름,
  값,
  목록,
  변경,
}: {
  id: string;
  이름: string;
  값: string;
  목록: string[];
  변경: (다음: string) => void;
}) {
  return (
    <div className={칸}>
      <Label htmlFor={id}>{이름}</Label>
      <Select value={값} onValueChange={다음 => 변경(다음 ?? '')}>
        <SelectTrigger id={id} className="min-h-11 font-normal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {목록.map(항목 => (
            <SelectItem key={항목} value={항목}>
              {항목}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function SpeakerProfileForm({
  프로필,
  변경,
}: {
  프로필: 프로필;
  변경: (다음: 프로필) => void;
}) {
  const 고침 = <K extends keyof 프로필>(키: K, 값: 프로필[K]) => 변경({ ...프로필, [키]: 값 });

  return (
    <Accordion defaultValue={['화자정보']}>
      <AccordionItem value="화자정보">
        <AccordionTrigger className="text-base font-bold">화자 정보</AccordionTrigger>
        <AccordionContent>
          <div className={판}>
            <고르기
              id="talk-gender"
              이름="성별"
              값={프로필.성별}
              목록={['형제', '자매']}
              변경={값 => 고침('성별', 값)}
            />
            <div className={칸}>
              <Label htmlFor="talk-age">연령</Label>
              <Input
                id="talk-age"
                type="number"
                min={10}
                max={110}
                value={프로필.연령}
                onChange={e => 고침('연령', Number(e.target.value))}
                className="min-h-11 font-normal"
              />
            </div>
            <고르기
              id="talk-role"
              이름="임명"
              값={프로필.임명}
              목록={임명목록}
              변경={값 => 고침('임명', 값)}
            />
            <Label
              htmlFor="talk-pioneer"
              className="flex min-h-11 items-center gap-2 text-sm font-bold text-ink-muted"
            >
              <Checkbox
                id="talk-pioneer"
                checked={프로필.파이오니아}
                onCheckedChange={값 => 고침('파이오니아', 값 === true)}
              />
              파이오니아
            </Label>
            <고르기
              id="talk-style"
              이름="스타일"
              값={프로필.스타일}
              목록={스타일목록}
              변경={값 => 고침('스타일', 값)}
            />
            <div className={칸}>
              <Label htmlFor="talk-cpm">분당 글자수</Label>
              <Input
                id="talk-cpm"
                type="number"
                min={150}
                max={600}
                value={프로필.분당글자수}
                onChange={e => 고침('분당글자수', Number(e.target.value))}
                className="min-h-11 font-normal"
              />
            </div>
            <div className={`${칸} col-span-full`}>
              <Label htmlFor="talk-sample">문체 견본</Label>
              <Textarea
                id="talk-sample"
                rows={4}
                value={프로필.문체견본}
                onChange={e => 고침('문체견본', e.target.value)}
                placeholder="잘 된 지난 원고를 붙여넣으십시오."
                className="min-h-24 resize-y font-normal"
              />
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
