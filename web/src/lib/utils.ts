// Tailwind 클래스 문자열을 조건부로 합치고 충돌을 정리한다.
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
