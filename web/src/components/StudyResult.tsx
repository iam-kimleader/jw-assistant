// 준비 자료 응답 하나를 머리말·구역·답변 카드로 펼쳐 놓는다.
import AnswerCard from './AnswerCard';
import StatusBox, { 판넬 } from './StatusBox';
import { 답변목록펼치기 } from '@/lib/answer-grouping.mjs';
import { cn } from '@/lib/utils';
import type { 답변 as 답변형, 준비결과 } from '@/lib/api';

type 펼친항목 =
  | { 종류: '소제목'; 값: string; 키: string }
  | { 종류: '상위질문'; 값: string; 키: string }
  | { 종류: '답변'; 값: 답변형; 키: string };

function 답변들({ 목록 }: { 목록: 답변형[] }) {
  const 펼침 = 답변목록펼치기(목록) as 펼친항목[];
  return (
    <>
      {펼침.map(항목 => {
        if (항목.종류 === '소제목') {
          return (
            <h3
              key={항목.키}
              className="mt-3 mb-0 border-t border-b-[3px] border-t-line border-b-gold pt-3 pb-2 text-lg text-[#3f464d]"
            >
              {항목.값}
            </h3>
          );
        }
        if (항목.종류 === '상위질문') {
          return (
            <p
              key={항목.키}
              className="m-0 border-l-4 border-l-gold bg-[#fff9eb] px-4 py-3 font-bold leading-normal"
            >
              {항목.값}
            </p>
          );
        }
        return <AnswerCard key={항목.키} 답변={항목.값} />;
      })}
    </>
  );
}

export default function StudyResult({ 자료 }: { 자료: 준비결과 }) {
  return (
    <>
      <div className={cn(판넬, 'px-5 py-4')}>
        <h2 className="mb-2 text-2xl">{자료.title}</h2>
        <p className="m-0 text-ink-muted">{자료.subtitle || 자료.sourceUrl || ''}</p>
      </div>

      {자료.generation?.warning && (
        <StatusBox 경고 className="px-4 py-3 shadow-none">
          {자료.generation.warning}
        </StatusBox>
      )}

      {자료.answers ? (
        <답변들 목록={자료.answers} />
      ) : (
        (자료.sections ?? []).map(구역 => (
          <div key={구역.id} className="grid gap-4">
            <h2 className="mt-3 mb-0 border-t-2 border-line pt-5 text-xl text-maroon">
              {구역.title}
            </h2>
            {구역.warning && <StatusBox 경고>{구역.warning}</StatusBox>}
            <답변들 목록={구역.answers ?? []} />
          </div>
        ))
      )}
    </>
  );
}
