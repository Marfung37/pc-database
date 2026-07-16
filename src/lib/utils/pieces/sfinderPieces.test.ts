import { describe, test, expect } from 'vitest';
import { sfinderPieces } from './sfinderPieces';

// factorials to be use in the computations of comb and perm
const factorials = Array.from({ length: 8 }, (_, i) => i);
factorials[0] = 1;
for (let i = 1; i < 8; i++) {
  factorials[i] *= factorials[i - 1];
}

function comb(n: number, k: number): number {
  return factorials[n] / (factorials[k] * factorials[n - k]);
}

function perm(n: number, k?: number): number {
  if (k === undefined) k = n;
  return factorials[n] / factorials[n - k];
}

describe('sfinder pieces', () => {
  test('same as generator', () => {
    expect(sfinderPieces('T').length).toBe(1);
    expect(sfinderPieces('I').length).toBe(1);
    expect(sfinderPieces('L').length).toBe(1);
    expect(sfinderPieces('J').length).toBe(1);
    expect(sfinderPieces('S').length).toBe(1);
    expect(sfinderPieces('Z').length).toBe(1);
    expect(sfinderPieces('O').length).toBe(1);
    expect(sfinderPieces('*').length).toBe(7);
    expect(sfinderPieces('[TS]').length).toBe(2);
    expect(sfinderPieces('[LSO]').length).toBe(3);
    expect(sfinderPieces('[TT]').length).toBe(1);
    expect(sfinderPieces('[TTI]').length).toBe(2);
    expect(sfinderPieces('[TS]!').length).toBe(2);
    expect(sfinderPieces('[LSO]!').length).toBe(6);
    expect(sfinderPieces('[LSO]p2').length).toBe(6);
    expect(sfinderPieces('*p2').length).toBe(perm(7, 2));
    expect(sfinderPieces('*p7').length).toBe(perm(7));
    expect(sfinderPieces('[[TS]]').length).toBe(2);
    expect(sfinderPieces('[I[TS]]').length).toBe(3);
    expect(sfinderPieces('[T[TS]]').length).toBe(2);
    expect(sfinderPieces('[T[TS]]p2').length).toBe(3);
  });

  test('multiple generator expressions', () => {
    expect(sfinderPieces('**').length).toBe(49);
    expect(sfinderPieces('*p7*p3').length).toBe(perm(7) * perm(7, 3));
    expect(sfinderPieces('*,*').length).toBe(49);
    expect(sfinderPieces('*p7,*p3').length).toBe(perm(7) * perm(7, 3));
    expect(sfinderPieces('[TL]![LJ]!').length).toBe(4);
    expect(sfinderPieces('[TL[SZ]]![LJ[SZ]]!').length).toBe(perm(3) * 2 * perm(3) * 2);
    expect(sfinderPieces('T;I').length).toBe(2);
    expect(sfinderPieces('[TIL]p2;[SZO]p2').length).toBe(perm(3, 2) + perm(3, 2));
  });

  test('filter expressions', () => {
    expect(sfinderPieces('*p4{T=1}').length).toBe(comb(6, 3) * perm(4));
    expect(sfinderPieces('*,*p4{T=1}').length).toBe(7 * comb(6, 3) * perm(4));
    expect(sfinderPieces('**p4{T=1}').length).toBe(comb(6, 4) * perm(4) + 6 * comb(6, 3) * perm(4));
    expect(sfinderPieces('[IL]!{T=1}').length).toBe(0);
    expect(sfinderPieces('[TIL]!{1-3:T=1}').length).toBe(perm(3) - perm(2)); // T not first
    expect(sfinderPieces('[TIL]!{/^T/}').length).toBe(perm(2)); // T first
    expect(sfinderPieces('[TIL]!{1-3:T=1};[TIL]!{/^T/}').length).toBe(perm(3));
    expect(sfinderPieces('[ILLS]!{LL<I}').length).toBe(4);
    expect(sfinderPieces('[TISZ]!{T[SZ]<I}').length).toBe(10);
    expect(sfinderPieces('*p2*p2{[*]=2}').length).toBe(924);
    expect(sfinderPieces('*p4{T<I[SZ]}').length).toBe(334);
    expect(sfinderPieces('*p4{T[LJ]<I[SZ]}').length).toBe(250);
  });

  test('expressions from database', () => {
    expect(sfinderPieces('*p7{!(IO<LJ||/[TO]$/||/T[LJ]$/)}').length).toBe(2720);
    expect(sfinderPieces('[LSZO]!{L<Z||LZ<S},[TIJ]!,*p3{!I[LJ][ZO]=1||(IJZ=1&&/^J/)}').length).toBe(
      18048
    );
    expect(sfinderPieces('[SZ]!,*p4{JSZO=1&&(/^SJ/||/^J.?S/||/^.JS/)}').length).toBe(16);
    expect(sfinderPieces('[LJSZ]!{2:LZ=1||3:LSZ=1||L<Z},[TIO]!,[^TIO]!{L<Z&&LZ<J}').length).toBe(
      384
    );
  });
});
