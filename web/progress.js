// 장기 준비 요청의 경과 시간으로 예상 진행률을 계산한다.
const 진행구간 = [
  [0, 3],
  [8_000, 12],
  [30_000, 30],
  [60_000, 55],
  [90_000, 72],
  [120_000, 86],
  [180_000, 94],
];

export function estimatePreparationProgress(elapsedMs) {
  const elapsed = Math.max(0, Number(elapsedMs) || 0);
  for (let index = 1; index < 진행구간.length; index++) {
    const [endTime, endProgress] = 진행구간[index];
    if (elapsed > endTime) continue;
    const [startTime, startProgress] = 진행구간[index - 1];
    const ratio = (elapsed - startTime) / (endTime - startTime);
    return Math.round(startProgress + ((endProgress - startProgress) * ratio));
  }
  return Math.min(96, 94 + Math.floor((elapsed - 180_000) / 60_000));
}
