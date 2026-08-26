// 뼈대의 구간별 시작·끝 초를 손으로 고칠 수 있는 표다.
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 구간합계, 분초표시 } from '@/lib/talk-format.mjs';
import type { 뼈대 as 뼈대형 } from '@/lib/talk-api';

export default function OutlineTable({
  뼈대,
  변경,
}: {
  뼈대: 뼈대형;
  변경: (다음: 뼈대형) => void;
}) {
  const 구간고침 = (i: number, 칸: '시작초' | '끝초', 값: number) =>
    변경({
      ...뼈대,
      구간: 뼈대.구간.map((구간, j) => (j === i ? { ...구간, [칸]: 값 } : 구간)),
    });

  return (
    <>
      {/* 좁은 화면에서 표가 페이지 전체를 밀지 않도록 표만 따로 굴린다. */}
      <div className="overflow-x-auto">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>구간</TableHead>
              <TableHead>시작(초)</TableHead>
              <TableHead>끝(초)</TableHead>
              <TableHead>목적</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {뼈대.구간.map((구간, i) => (
              <TableRow key={`${구간.이름}-${i}`}>
                <TableCell>{구간.이름}</TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    aria-label={`${구간.이름} 시작 초`}
                    value={구간.시작초}
                    onChange={e => 구간고침(i, '시작초', Number(e.target.value) || 0)}
                    className="min-h-11 w-full"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={0}
                    aria-label={`${구간.이름} 끝 초`}
                    value={구간.끝초}
                    onChange={e => 구간고침(i, '끝초', Number(e.target.value) || 0)}
                    className="min-h-11 w-full"
                  />
                </TableCell>
                <TableCell>{구간.목적}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <p className="m-0" role="status">
        배정 {분초표시(뼈대.배정시간)} · 현재 구간 합계 {분초표시(구간합계(뼈대.구간))}
      </p>
    </>
  );
}
