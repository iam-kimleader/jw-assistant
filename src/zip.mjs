// ZIP 아카이브의 항목 목록을 읽고 개별 항목을 꺼내는 최소 구현
import { openSync, readSync, fstatSync, closeSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

const EOCD_SIG = 0x06054b50;
const CEN_SIG = 0x02014b50;

export function readEntries(zipPath) {
  const fd = openSync(zipPath, 'r');
  try {
    const size = fstatSync(fd).size;
    const tailLen = Math.min(size, 22 + 65535);
    const tail = Buffer.alloc(tailLen);
    readSync(fd, tail, 0, tailLen, size - tailLen);

    let eocd = -1;
    for (let i = tail.length - 22; i >= 0; i--) {
      if (tail.readUInt32LE(i) === EOCD_SIG) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('EOCD 를 찾을 수 없음 — ZIP 파일이 아니다');

    const count = tail.readUInt16LE(eocd + 10);
    const cenSize = tail.readUInt32LE(eocd + 12);
    const cenOff = tail.readUInt32LE(eocd + 16);

    const cen = Buffer.alloc(cenSize);
    readSync(fd, cen, 0, cenSize, cenOff);

    const entries = [];
    let p = 0;
    for (let i = 0; i < count; i++) {
      if (cen.readUInt32LE(p) !== CEN_SIG) throw new Error('중앙 디렉터리 시그니처가 맞지 않는다');
      const method = cen.readUInt16LE(p + 10);
      const compSize = cen.readUInt32LE(p + 20);
      const rawSize = cen.readUInt32LE(p + 24);
      const nameLen = cen.readUInt16LE(p + 28);
      const extraLen = cen.readUInt16LE(p + 30);
      const cmtLen = cen.readUInt16LE(p + 32);
      const localOff = cen.readUInt32LE(p + 42);
      const name = cen.subarray(p + 46, p + 46 + nameLen).toString('utf8');
      entries.push({ name, method, compSize, rawSize, localOff });
      p += 46 + nameLen + extraLen + cmtLen;
    }
    return entries;
  } finally {
    closeSync(fd);
  }
}

export function extractEntry(zipPath, entry) {
  const fd = openSync(zipPath, 'r');
  try {
    const lh = Buffer.alloc(30);
    readSync(fd, lh, 0, 30, entry.localOff);
    const nameLen = lh.readUInt16LE(26);
    const extraLen = lh.readUInt16LE(28);
    const dataOff = entry.localOff + 30 + nameLen + extraLen;

    const comp = Buffer.alloc(entry.compSize);
    readSync(fd, comp, 0, entry.compSize, dataOff);

    if (entry.method === 0) return comp;
    if (entry.method === 8) return inflateRawSync(comp);
    throw new Error(`지원하지 않는 압축 방식이다: ${entry.method}`);
  } finally {
    closeSync(fd);
  }
}
