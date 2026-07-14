import { describe, test, expect } from 'vitest';
import { Parser } from './parser';
import { type FilterBlock } from './defines';
import { evaluateFilter } from './evaluateFilter';
const parser = new Parser();

function helper(expression: string, queue: string): boolean {
  return evaluateFilter((parser.parse(expression)[0] as FilterBlock).expr, queue)
}

describe("filter evaluation", () => {
  test("count filter", () => {
    expect(helper("{T=0}", "IIII")).toBeTruthy();
    expect(helper("{T=0}", "IIII")).toBeTruthy()
    expect(helper("{T=0}", "IITI")).toBeFalsy()
    expect(helper("{T=1}", "TIII")).toBeTruthy()
    expect(helper("{T=1}", "ITII")).toBeTruthy()
    expect(helper("{T=1}", "IIIT")).toBeTruthy()
    expect(helper("{T=1}", "ITIT")).toBeFalsy()
    expect(helper("{T=1}", "TTIT")).toBeFalsy()
    expect(helper("{T=2}", "ITIT")).toBeTruthy()
    expect(helper("{T=2}", "TTIT")).toBeFalsy()
    expect(helper("{T=3}", "TTIT")).toBeTruthy()
    expect(helper("{T=3}", "TTIT")).toBeTruthy()
    expect(helper("{T>0}", "TIII")).toBeTruthy()
    expect(helper("{T>0}", "TITI")).toBeTruthy()
    expect(helper("{T>0}", "ITTT")).toBeTruthy()
    expect(helper("{T>0}", "TTTT")).toBeTruthy()
    expect(helper("{T>0}", "IIII")).toBeFalsy()
    expect(helper("{T<1}", "IIII")).toBeTruthy()
    expect(helper("{T<1}", "ITII")).toBeFalsy()
    expect(helper("{T<1}", "ITIT")).toBeFalsy()
    expect(helper("{T<=1}", "ITIT")).toBeFalsy()
    expect(helper("{T<=1}", "IIIT")).toBeTruthy()
    expect(helper("{T<=1}", "IIII")).toBeTruthy()
    expect(helper("{T>=1}", "IIII")).toBeFalsy()
    expect(helper("{T>=1}", "ITII")).toBeTruthy()
    expect(helper("{T>=1}", "ITTT")).toBeTruthy()
    expect(helper("{T!=1}", "IIII")).toBeTruthy()
    expect(helper("{T!=1}", "ITTI")).toBeTruthy()
    expect(helper("{T!=1}", "TTTT")).toBeTruthy()
    expect(helper("{T!=1}", "IIIT")).toBeFalsy()
    expect(helper("{T[LJ]=1}", "TLJ")).toBeTruthy()
    expect(helper("{T[LJ]=1}", "JTI")).toBeTruthy()
    expect(helper("{T[LJ]=1}", "TLI")).toBeTruthy()
    expect(helper("{T[LJ]=1}", "ITS")).toBeFalsy()
    expect(helper("{*=1}", "TILJSZO")).toBeTruthy()
    expect(helper("{*=1}", "TILJJSZO")).toBeFalsy()
    expect(helper("{*=1}", "TILJZO")).toBeFalsy()
    expect(helper("{*>=1}", "TILJJSZO")).toBeTruthy()
    expect(helper("{[*]=2}", "TT")).toBeTruthy()
    expect(helper("{[*]=2}", "II")).toBeTruthy()
    expect(helper("{[*]=2}", "SS")).toBeTruthy()
    expect(helper("{[*]=2}", "LL")).toBeTruthy()
    expect(helper("{[*]=2}", "OO")).toBeTruthy()
    expect(helper("{[*]=2}", "TILJS")).toBeFalsy()
    expect(helper("{[*]=2}", "LJSZO")).toBeFalsy()
  });

  test("before filter", () => {
    expect(helper("{T<I}", "TI")).toBeTruthy()
    expect(helper("{T<I}", "IT")).toBeFalsy()
    expect(helper("{I<T}", "TI")).toBeFalsy()
    expect(helper("{I<T}", "IT")).toBeTruthy()
    expect(helper("{T<I}", "II")).toBeFalsy()
    expect(helper("{I<T}", "II")).toBeTruthy()
    expect(helper("{T[SZ]<I}", "TSI")).toBeTruthy()
    expect(helper("{T[SZ]<I}", "TSZI")).toBeTruthy()
    expect(helper("{T[SZ]<I}", "TSIZ")).toBeTruthy()
    expect(helper("{T[SZ]<I}", "TISZ")).toBeFalsy()
    expect(helper("{T[SZ]<I}", "SZIT")).toBeFalsy()
    expect(helper("{T[SZ]<I}", "SIZT")).toBeFalsy()
    expect(helper("{T<I[SZ]}", "TSI")).toBeTruthy()
    expect(helper("{T<I[SZ]}", "TSZI")).toBeTruthy()
    expect(helper("{T<I[SZ]}", "TSIZ")).toBeTruthy()
    expect(helper("{T<I[SZ]}", "STZI")).toBeTruthy()
    expect(helper("{T<I[SZ]}", "SZIT")).toBeFalsy()
    expect(helper("{T<I[SZ]}", "SITZ")).toBeFalsy()
    expect(helper("{T<I[SZ]}", "SZTI")).toBeFalsy()
    expect(helper("{T[LJ]<I[SZ]}", "TLJISZ")).toBeTruthy()
    expect(helper("{T[LJ]<I[SZ]}", "TLIS")).toBeTruthy()
    expect(helper("{T[LJ]<I[SZ]}", "LITS")).toBeFalsy()
    expect(helper("{T[LJ]<I[SZ]}", "JITS")).toBeFalsy()
    expect(helper("{T[LJ]<I[SZ]}", "TLSJIZ")).toBeTruthy()
    expect(helper("{T[LJ]<I[SZ]}", "TJZILS")).toBeTruthy()
    expect(helper("{II<T}", "IIT")).toBeTruthy()
    expect(helper("{II<T}", "II")).toBeTruthy()
    expect(helper("{II<T}", "IITI")).toBeTruthy()
    expect(helper("{II<T}", "ITII")).toBeFalsy()
    expect(helper("{II<T}", "ILIT")).toBeTruthy()
    expect(helper("{II<T}", "ITI")).toBeFalsy()
    expect(helper("{T<I[IS]}", "TII")).toBeTruthy()
    expect(helper("{T<I[IS]}", "TIS")).toBeTruthy()
    expect(helper("{T<I[IS]}", "TIZ")).toBeTruthy()
    expect(helper("{T<I[IS]}", "IT")).toBeFalsy()
    expect(helper("{T<I[SZ]}", "LZOJ")).toBeFalsy()
    expect(helper("{T[TI]<O}", "TO")).toBeFalsy()
    expect(helper("{T[TI]<O}", "TTO")).toBeTruthy()
    expect(helper("{T[TI]<O}", "ITO")).toBeTruthy()
    expect(helper("{T[TI]<O}", "IOT")).toBeFalsy()
    expect(helper("{T[TI]<O}", "TOT")).toBeFalsy()
    expect(helper("{T[TI]<O}", "TOI")).toBeFalsy()
    expect(helper("{[TI][TI]<O}", "TTO")).toBeTruthy()
    expect(helper("{[TI][TI]<O}", "TIO")).toBeTruthy()
    expect(helper("{[TI][TI]<O}", "ITO")).toBeTruthy()
    expect(helper("{[TI][TI]<O}", "IIO")).toBeTruthy()
    expect(helper("{[TI][TI]<O}", "IOT")).toBeFalsy()
    expect(helper("{[TI][TI]<O}", "TOT")).toBeFalsy()
    expect(helper("{[TI][TI]<O}", "TOI")).toBeFalsy()
    expect(helper("{[TI][TI]<O}", "IOI")).toBeFalsy()
    expect(helper("{[TI][TS]<O}", "TIOTS")).toBeTruthy()
    expect(helper("{[TI][TS]<O}", "ISOTI")).toBeTruthy()
  })

  test("regex filter", () => {
    expect(helper("{/^T/}", "TIL")).toBeTruthy()
    expect(helper("{/^T/}", "TSZ")).toBeTruthy()
    expect(helper("{/^T/}", "ITL")).toBeFalsy()
    expect(helper("{/^T/}", "LIT")).toBeFalsy()
  })

  test("range modifier", () => {
    expect(helper("{4:T=1}", "TIII")).toBeTruthy()
    expect(helper("{4:T=1}", "IIIIT")).toBeFalsy()  // T is at index 4 (outside range 0-4)
    expect(helper("{4:(T=1&&S=1)}", "IISIT")).toBeFalsy()  // T is out of range
    expect(helper("{4:(T=1&&S=1)}", "IITIS")).toBeFalsy()  // S is out of range
    expect(helper("{4:(T=1&&S=1)}", "ITSII")).toBeTruthy()  // both S and T within first 4
    expect(helper("{3-7:T=1}", "IIITIII")).toBeTruthy()  // T is within index 3 to 7
    expect(helper("{3-7:T=1}", "TIIIIII")).toBeFalsy()  // T is before index 3
    expect(helper("{3-7:(T=1&&S=1)}", "IISITIISI")).toBeFalsy()  // S is out of range
    expect(helper("{3-7:(T=1&&S=1)}", "IITISIIII")).toBeFalsy()  // T is out of range
    expect(helper("{3-7:(T=1&&S=1)}", "IITISTIII")).toBeTruthy()  // both S and T within range
  })

  test("boolean logic", () => {
    expect(helper("{[LJ]=1&&!LJ=1}", "LJ")).toBeFalsy()
    expect(helper("{[LJ]=1&&!LJ=1}", "LI")).toBeTruthy()
    expect(helper("{[LJ]=1&&!LJ=1}", "IJ")).toBeTruthy()
    expect(helper("{[LJ]=1&&!LJ=1}", "IS")).toBeFalsy()
    expect(helper("{([LJ]=1&&!LJ=1)||LJ=0}", "LJ")).toBeFalsy()
    expect(helper("{([LJ]=1&&!LJ=1)||LJ=0}", "LI")).toBeTruthy()
    expect(helper("{([LJ]=1&&!LJ=1)||LJ=0}", "IJ")).toBeTruthy()
    expect(helper("{([LJ]=1&&!LJ=1)||LJ=0}", "IS")).toBeTruthy()
  })
})
