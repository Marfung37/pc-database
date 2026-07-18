import { describe, test, expect } from 'vitest';
import { parsePattern, randomSfinderPieces, sfinderPieces } from './sfinderPieces';
import { comb, perm } from './utils';

describe('sfinder pieces', () => {
  test('same as generator', () => {
    expect(sfinderPieces(parsePattern('')).length).toBe(0);
    expect(sfinderPieces(parsePattern('T')).length).toBe(1);
    expect(sfinderPieces(parsePattern('I')).length).toBe(1);
    expect(sfinderPieces(parsePattern('L')).length).toBe(1);
    expect(sfinderPieces(parsePattern('J')).length).toBe(1);
    expect(sfinderPieces(parsePattern('S')).length).toBe(1);
    expect(sfinderPieces(parsePattern('Z')).length).toBe(1);
    expect(sfinderPieces(parsePattern('O')).length).toBe(1);
    expect(sfinderPieces(parsePattern('*')).length).toBe(7);
    expect(sfinderPieces(parsePattern('[TS]')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[LSO]')).length).toBe(3);
    expect(sfinderPieces(parsePattern('[TT]')).length).toBe(1);
    expect(sfinderPieces(parsePattern('[TTI]')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[TS]!')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[LSO]!')).length).toBe(6);
    expect(sfinderPieces(parsePattern('[LSO]p2')).length).toBe(6);
    expect(sfinderPieces(parsePattern('*p2')).length).toBe(perm(7, 2));
    expect(sfinderPieces(parsePattern('*p7')).length).toBe(perm(7));
    expect(sfinderPieces(parsePattern('[[TS]]')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[I[TS]]')).length).toBe(3);
    expect(sfinderPieces(parsePattern('[T[TS]]')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[T[TS]]p2')).length).toBe(3);
  });

  test('multiple generator expressions', () => {
    expect(sfinderPieces(parsePattern('**')).length).toBe(49);
    expect(sfinderPieces(parsePattern('*p7*p3')).length).toBe(perm(7) * perm(7, 3));
    expect(sfinderPieces(parsePattern('*,*')).length).toBe(49);
    expect(sfinderPieces(parsePattern('*p7,*p3')).length).toBe(perm(7) * perm(7, 3));
    expect(sfinderPieces(parsePattern('[TL]![LJ]!')).length).toBe(4);
    expect(sfinderPieces(parsePattern('[TL[SZ]]![LJ[SZ]]!')).length).toBe(
      perm(3) * 2 * perm(3) * 2
    );
    expect(sfinderPieces(parsePattern('T;I')).length).toBe(2);
    expect(sfinderPieces(parsePattern('[TIL]p2;[SZO]p2')).length).toBe(perm(3, 2) + perm(3, 2));
  });

  test('filter expressions', () => {
    expect(sfinderPieces(parsePattern('*p4{T=1}')).length).toBe(comb(6, 3) * perm(4));
    expect(sfinderPieces(parsePattern('*,*p4{T=1}')).length).toBe(7 * comb(6, 3) * perm(4));
    expect(sfinderPieces(parsePattern('**p4{T=1}')).length).toBe(
      comb(6, 4) * perm(4) + 6 * comb(6, 3) * perm(4)
    );
    expect(sfinderPieces(parsePattern('[IL]!{T=1}')).length).toBe(0);
    expect(sfinderPieces(parsePattern('[TIL]!{1-3:T=1}')).length).toBe(perm(3) - perm(2)); // T not first
    expect(sfinderPieces(parsePattern('[TIL]!{/^T/}')).length).toBe(perm(2)); // T first
    expect(sfinderPieces(parsePattern('[TIL]!{1-3:T=1};[TIL]!{/^T/}')).length).toBe(perm(3));
    expect(sfinderPieces(parsePattern('[ILLS]!{LL<I}')).length).toBe(4);
    expect(sfinderPieces(parsePattern('[TISZ]!{T[SZ]<I}')).length).toBe(10);
    expect(sfinderPieces(parsePattern('*p2*p2{[*]=2}')).length).toBe(924);
    expect(sfinderPieces(parsePattern('*p4{T<I[SZ]}')).length).toBe(334);
    expect(sfinderPieces(parsePattern('*p4{T[LJ]<I[SZ]}')).length).toBe(250);
  });

  test('expressions from database', () => {
    expect(sfinderPieces(parsePattern('*p7{!(IO<LJ||/[TO]$/||/T[LJ]$/)}')).length).toBe(2720);
    expect(
      sfinderPieces(parsePattern('[LSZO]!{L<Z||LZ<S},[TIJ]!,*p3{!I[LJ][ZO]=1||(IJZ=1&&/^J/)}'))
        .length
    ).toBe(18048);
    expect(sfinderPieces(parsePattern('[SZ]!,*p4{JSZO=1&&(/^SJ/||/^J.?S/||/^.JS/)}')).length).toBe(
      16
    );
    expect(
      sfinderPieces(parsePattern('[LJSZ]!{2:LZ=1||3:LSZ=1||L<Z},[TIO]!,[^TIO]!{L<Z&&LZ<J}')).length
    ).toBe(384);
  });
});

const SAMPLE_RATIO = 1 / 10;
const random = (a: number, b: number) => Math.floor(Math.random() * (b - a)) + a;

function helper(pattern: string): boolean {
  const parsedPattern = parsePattern(pattern);
  const allQueues = new Set(sfinderPieces(parsedPattern));

  if (allQueues.size == 0) {
    return randomSfinderPieces(parsedPattern, random) === null;
  }

  const samples = Math.min(
    Math.max(Math.min(5, allQueues.size), Math.ceil(SAMPLE_RATIO * allQueues.size)),
    50
  );
  let result = true;
  for (let _ = 0; _ < samples; _++) {
    const queue = randomSfinderPieces(parsedPattern, random);
    if (queue === null) return false;
    result &&= allQueues.has(queue);
  }
  return result;
}

describe('random sfinder pieces', () => {
  test('same as generator', () => {
    expect(helper('')).toBeTruthy();
    expect(helper('T')).toBeTruthy();
    expect(helper('I')).toBeTruthy();
    expect(helper('L')).toBeTruthy();
    expect(helper('J')).toBeTruthy();
    expect(helper('S')).toBeTruthy();
    expect(helper('Z')).toBeTruthy();
    expect(helper('O')).toBeTruthy();
    expect(helper('*')).toBeTruthy();
    expect(helper('[TS]')).toBeTruthy();
    expect(helper('[LSO]')).toBeTruthy();
    expect(helper('[TT]')).toBeTruthy();
    expect(helper('[TTI]')).toBeTruthy();
    expect(helper('[TS]!')).toBeTruthy();
    expect(helper('[LSO]!')).toBeTruthy();
    expect(helper('[LSO]p2')).toBeTruthy();
    expect(helper('*p2')).toBeTruthy();
    expect(helper('*p7')).toBeTruthy();
    expect(helper('[[TS]]')).toBeTruthy();
    expect(helper('[I[TS]]')).toBeTruthy();
    expect(helper('[T[TS]]')).toBeTruthy();
    expect(helper('[T[TS]]p2')).toBeTruthy();
  });

  test('multiple generator expressions', () => {
    expect(helper('**')).toBeTruthy();
    expect(helper('*p7*p3')).toBeTruthy();
    expect(helper('*,*')).toBeTruthy();
    expect(helper('*p7,*p3')).toBeTruthy();
    expect(helper('[TL]![LJ]!')).toBeTruthy();
    expect(helper('[TL[SZ]]![LJ[SZ]]!')).toBeTruthy();
    expect(helper('T;I')).toBeTruthy();
    expect(helper('[TIL]p2;[SZO]p2')).toBeTruthy();
  });

  test('filter expressions', () => {
    expect(helper('*p4{T=1}')).toBeTruthy();
    expect(helper('*,*p4{T=1}')).toBeTruthy();
    expect(helper('**p4{T=1}')).toBeTruthy();
    expect(helper('[IL]!{T=1}')).toBeTruthy();
    expect(helper('[TIL]!{1-3:T=1}')).toBeTruthy();
    expect(helper('[TIL]!{/^T/}')).toBeTruthy();
    expect(helper('[TIL]!{1-3:T=1};[TIL]!{/^T/}')).toBeTruthy();
    expect(helper('[ILLS]!{LL<I}')).toBeTruthy();
    expect(helper('[TISZ]!{T[SZ]<I}')).toBeTruthy();
    expect(helper('*p2*p2{[*]=2}')).toBeTruthy();
    expect(helper('*p4{T<I[SZ]}')).toBeTruthy();
    expect(helper('*p4{T[LJ]<I[SZ]}')).toBeTruthy();
  });

  test('expressions from database', () => {
    expect(helper('*p7{!(IO<LJ||/[TO]$/||/T[LJ]$/)}')).toBeTruthy();
    expect(helper('[LSZO]!{L<Z||LZ<S},[TIJ]!,*p3{!I[LJ][ZO]=1||(IJZ=1&&/^J/)}')).toBeTruthy();
    expect(helper('[SZ]!,*p4{JSZO=1&&(/^SJ/||/^J.?S/||/^.JS/)}')).toBeTruthy();
    expect(helper('[LJSZ]!{2:LZ=1||3:LSZ=1||L<Z},[TIO]!,[^TIO]!{L<Z&&LZ<J}')).toBeTruthy();
  });
});
