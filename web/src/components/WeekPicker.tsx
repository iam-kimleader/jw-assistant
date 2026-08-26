// 준비할 주간을 고르는 선택 상자다.
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { 주간 } from '@/lib/api';

export default function WeekPicker({
  id,
  주간들,
  값,
  변경,
}: {
  id: string;
  주간들: 주간[];
  값: string;
  변경: (다음: string) => void;
}) {
  return (
    <>
      <Label htmlFor={id} className="text-sm font-bold text-ink-muted">
        주간
      </Label>
      <Select value={값} onValueChange={다음 => 변경(다음 ?? '')}>
        <SelectTrigger id={id} className="min-h-11 w-full min-w-[min(250px,100%)] sm:w-auto">
          <SelectValue placeholder="주간을 고르세요" />
        </SelectTrigger>
        <SelectContent>
          {주간들.map(주 => (
            <SelectItem key={주.value} value={주.value}>
              {주.current ? `${주.label} 현재 주` : 주.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </>
  );
}
