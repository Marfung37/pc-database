import type { Queue, SetupID, Fumen } from '$lib/types';
import { PIECEVAL, BAG, PCSIZE } from '$lib/constants';

const setupidRegex = new RegExp('^[1-9][0-9a-f]{11}$');
const ID_BYTE_SIZE = 6;
const UNIQUE_ID_BYTE_SIZE = 1;

export function isSetupID(s: string): boolean {
  return setupidRegex.test(s);
}

export function generateSetupIDPrefix(
  pc: number,
  oqb: boolean,
  leftover: Queue,
  build: Queue,
  coverPattern: string,
  fumen: Fumen
): SetupID {
  // assumes leftover and build are already sorted
  const byteLength = ID_BYTE_SIZE - UNIQUE_ID_BYTE_SIZE;
  let currentBitOffset = 0n;
  let tempPackedNum = 0n;

  // adds pc taking 4 bits
  currentBitOffset += 4n;
  tempPackedNum |= BigInt(pc) << (BigInt(byteLength) * 8n - currentBitOffset);

  // adds oqb taking 1 bits
  currentBitOffset += 1n;
  tempPackedNum |= BigInt(oqb) << (BigInt(byteLength) * 8n - currentBitOffset);

  // compute necessary values for leftover
  const pieceCounts: Record<string, number> = {};
  for (const piece of BAG) pieceCounts[piece] = 1;

  let duplicatePiece: string = '';
  for (let i = 0; i < leftover.length; i++) {
    if (--pieceCounts[leftover[i]] < 0) {
      duplicatePiece = leftover[i];
    }
  }
  const duplicateIndex = duplicatePiece ? PIECEVAL[duplicatePiece] : 0;

  // adds duplicate piece taking 3 bits
  currentBitOffset += 3n;
  tempPackedNum |= BigInt(duplicateIndex) << (BigInt(byteLength) * 8n - currentBitOffset);

  // adds leftover piece counts taking 7 bits
  for (const piece of BAG) {
    currentBitOffset += 1n;
    if (pieceCounts[piece] < 0) pieceCounts[piece] = 0;
    tempPackedNum |= BigInt(pieceCounts[piece]) << (BigInt(byteLength) * 8n - currentBitOffset);
  }

  // adds solve length taking 4 bits
  currentBitOffset += 4n;
  tempPackedNum |= BigInt(PCSIZE - build.length) << (BigInt(byteLength) * 8n - currentBitOffset);

  // compute necessary values for build
  for (const piece of BAG) pieceCounts[piece] = 3;
  let fourX: boolean = false;
  for (let i = 0; i < build.length; i++) {
    if (--pieceCounts[build[i]] < 0) {
      fourX = true;
    }
  }

  // adds 4x taking 1 bits
  currentBitOffset += 1n;
  tempPackedNum |= BigInt(fourX) << (BigInt(byteLength) * 8n - currentBitOffset);

  // adds build piece counts taking 14 bits
  for (const piece of BAG) {
    currentBitOffset += 2n;
    if (pieceCounts[piece] < 0) pieceCounts[piece] = 0;
    tempPackedNum |= BigInt(pieceCounts[piece]) << (BigInt(byteLength) * 8n - currentBitOffset);
  }

  // adds fumen hash taking 4 bits
  currentBitOffset += 4n;
  tempPackedNum |= BigInt(hashFumen(fumen)) << (BigInt(byteLength) * 8n - currentBitOffset);

  // adds cover hash taking 2 bits
  currentBitOffset += 2n;
  tempPackedNum |=
    BigInt(hashCoverPattern(coverPattern)) << (BigInt(byteLength) * 8n - currentBitOffset);

  return tempPackedNum.toString(16) as SetupID;
}

export function hashFumen(fumen: string, bits: number = 4): number {
  const randomSection = fumen.slice(5, -8); // section of fumen that is reasonably random
  let xor = randomSection.length;

  for (let i = 0; i < randomSection.length; i++) {
    xor = ((xor << 3) | (xor >> 4)) & 0x7f;
    xor ^= randomSection.charCodeAt(i);
  }

  return xor & ((1 << bits) - 1);
}

export function hashCoverPattern(coverPattern: string, bits: number = 2): number {
  let xor = coverPattern.length;

  for (let i = 0; i < coverPattern.length; i++) {
    xor ^= coverPattern.charCodeAt(i);
  }

  return xor & ((1 << bits) - 1);
}

export function getPrefix(setupid: SetupID): string {
  return setupid.slice(0, -2);
}

export function getNoHashPrefix(setupid: SetupID): string {
  return setupid.slice(0, -4);
}

export function getNoHashPrefixRegex(setupid: SetupID): string {
  const lastPart = parseInt(setupid[setupid.length - 4], 16) & 0b1100;
  return (
    '^' + getNoHashPrefix(setupid) + `[${lastPart.toString(16)}-${(lastPart + 3).toString(16)}]`
  );
}
