import { describe, test, expect } from 'vitest';
import { Parser } from './parser';
import {
  GeneratorLiteral,
  FilterBlock,
  CountLiteral,
  BeforeLiteral,
  RegexLiteral,
  RangeLookup,
  BinaryOp,
  UnaryOp
} from './defines';

const parser = new Parser();

describe('pieces parser', () => {
  test('parsing generator expressions', () => {
    expect(parser.parse('T')).toEqual([new GeneratorLiteral(['T'], 1)]);
    expect(parser.parse('L')).toEqual([new GeneratorLiteral(['L'], 1)]);
    expect(parser.parse('*')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 1)
    ]);
    expect(parser.parse('[TILJSZO]')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 1)
    ]);
    expect(parser.parse('[TI]')).toEqual([new GeneratorLiteral(['T', 'I'], 1)]);
    expect(parser.parse('[SIJ]')).toEqual([new GeneratorLiteral(['I', 'J', 'S'], 1)]);
    expect(parser.parse('*p2')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 2)
    ]);
    expect(parser.parse('*p6')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 6)
    ]);
    expect(parser.parse('*!')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 7)
    ]);
    expect(parser.parse('[TI]p2')).toEqual([new GeneratorLiteral(['T', 'I'], 2)]);
    expect(parser.parse('[TI]!')).toEqual([new GeneratorLiteral(['T', 'I'], 2)]);
    expect(parser.parse('[SIJ]p2')).toEqual([new GeneratorLiteral(['I', 'J', 'S'], 2)]);
    expect(parser.parse('[SIJ]!')).toEqual([new GeneratorLiteral(['I', 'J', 'S'], 3)]);
    expect(parser.parse('[TTI]')).toEqual([new GeneratorLiteral(['T', 'T', 'I'], 1)]);
    expect(parser.parse('[TTI]!')).toEqual([new GeneratorLiteral(['T', 'T', 'I'], 3)]);
    expect(parser.parse('[ITT]!')).toEqual([new GeneratorLiteral(['T', 'T', 'I'], 3)]);
    expect(parser.parse('[^TIJ]')).toEqual([new GeneratorLiteral(['L', 'S', 'Z', 'O'], 1)]);
    expect(parser.parse('[^TIJ]!')).toEqual([new GeneratorLiteral(['L', 'S', 'Z', 'O'], 4)]);
    expect(parser.parse('[^JTI]!')).toEqual([new GeneratorLiteral(['L', 'S', 'Z', 'O'], 4)]);
    expect(parser.parse('[L[SZ]]')).toEqual([new GeneratorLiteral(['L', 'SZ'], 1)]);
    expect(parser.parse('[L[SZ]]!')).toEqual([new GeneratorLiteral(['L', 'SZ'], 2)]);
    expect(parser.parse('[[TI]L[SZ]]!')).toEqual([new GeneratorLiteral(['L', 'TI', 'SZ'], 3)]);
    expect(parser.parse('[L[^SZ]]!')).toEqual([new GeneratorLiteral(['L', 'TILJO'], 2)]);
    expect(parser.parse('[^TI[LJ]]!')).toEqual([
      new GeneratorLiteral(['L', 'J', 'S', 'Z', 'O', 'LJ'], 6)
    ]);
    expect(parser.parse('[^TILJSZ[O]]!')).toEqual([new GeneratorLiteral(['O', 'O'], 2)]);
    expect(parser.parse('[^TIJ[^LJO]]!')).toEqual([
      new GeneratorLiteral(['L', 'S', 'Z', 'O', 'TISZ'], 5)
    ]);
    expect(parser.parse('[^TILJSZ[^O]]!')).toEqual([new GeneratorLiteral(['O', 'TILJSZ'], 2)]);
  });

  test('parsing filter expressions', () => {
    expect(parser.parse('{T=1}')).toEqual([new FilterBlock(new CountLiteral(['T'], '=', 1))]);
    expect(parser.parse('{T!=1 }')).toEqual([new FilterBlock(new CountLiteral(['T'], '!=', 1))]);
    expect(parser.parse('{T >1}')).toEqual([new FilterBlock(new CountLiteral(['T'], '>', 1))]);
    expect(parser.parse('{T< 1}')).toEqual([new FilterBlock(new CountLiteral(['T'], '<', 1))]);
    expect(parser.parse('{ T>=1}')).toEqual([new FilterBlock(new CountLiteral(['T'], '>=', 1))]);
    expect(parser.parse('{ T <=  1 }')).toEqual([
      new FilterBlock(new CountLiteral(['T'], '<=', 1))
    ]);
    expect(parser.parse('{1:T=1}')).toEqual([
      new FilterBlock(new RangeLookup(0, 1, new CountLiteral(['T'], '=', 1)))
    ]);
    expect(parser.parse('{1-2:T=1}')).toEqual([
      new FilterBlock(new RangeLookup(1, 2, new CountLiteral(['T'], '=', 1)))
    ]);
    expect(parser.parse('{/^T/}')).toEqual([new FilterBlock(new RegexLiteral(/^T/))]);
    expect(parser.parse('{1:/^T/}')).toEqual([
      new FilterBlock(new RangeLookup(0, 1, new RegexLiteral(/^T/)))
    ]);
    expect(parser.parse('{T<L}')).toEqual([new FilterBlock(new BeforeLiteral(['T'], ['L']))]);
    expect(parser.parse('{IT<[LJ]}')).toEqual([
      new FilterBlock(new BeforeLiteral(['I', 'T'], ['LJ']))
    ]);
    expect(parser.parse('{3:T<L}')).toEqual([
      new FilterBlock(new RangeLookup(0, 3, new BeforeLiteral(['T'], ['L'])))
    ]);
    expect(parser.parse('{[LJ]=1&&!LJ=1}')).toEqual([
      new FilterBlock(
        new BinaryOp(
          new CountLiteral(['LJ'], '=', 1),
          'AND',
          new UnaryOp('NOT', new CountLiteral(['L', 'J'], '=', 1))
        )
      )
    ]);
    expect(parser.parse('{([LJ]=1&&!LJ=1)||LJ=0}')).toEqual([
      new FilterBlock(
        new BinaryOp(
          new BinaryOp(
            new CountLiteral(['LJ'], '=', 1),
            'AND',
            new UnaryOp('NOT', new CountLiteral(['L', 'J'], '=', 1))
          ),
          'OR',
          new CountLiteral(['L', 'J'], '=', 0)
        )
      )
    ]);
  });

  test('generator invalid expressions', () => {
    expect(() => parser.parse('[T]p2')).toThrow();
    expect(() => parser.parse('*p8')).toThrow();
    expect(() => parser.parse('[t]')).toThrow();
    expect(() => parser.parse('[I')).toThrow();
    expect(() => parser.parse('I]')).toThrow();
    expect(() => parser.parse('[^^O]')).toThrow();
    expect(() => parser.parse('[SZJJ]p0')).toThrow();
    expect(() => parser.parse('[T]p')).toThrow();
    expect(() => parser.parse('*p')).toThrow();
    expect(() => parser.parse('abdfa[T]')).toThrow();
    expect(() => parser.parse('[Tabdfa]')).toThrow();
  });

  test('filter invalid expressions', () => {
    expect(() => parser.parse('{1=1}')).toThrow();
    expect(() => parser.parse('{1=T}')).toThrow();
    expect(() => parser.parse('{T=T}')).toThrow();
    expect(() => parser.parse('{T>I}')).toThrow();
    expect(() => parser.parse('{3>I}')).toThrow();
    expect(() => parser.parse('{1-:T=1}')).toThrow();
    expect(() => parser.parse('{-2:T=1}')).toThrow();
    expect(() => parser.parse('{/abc}')).toThrow();
    expect(() => parser.parse('{abc/}')).toThrow();
    expect(() => parser.parse('{[[[T]]]}')).toThrow();
    expect(() => parser.parse('{T=1&L=1}')).toThrow();
    expect(() => parser.parse('{T=1{}I=1}')).toThrow();
    expect(() => parser.parse('{T=1{I=1}')).toThrow();
    expect(() => parser.parse('{T=1   I=1}')).toThrow();
  });

  test('parsing multiblocks', () => {
    expect(parser.parse('**')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 1),
      new GeneratorLiteral(['T', 'I', 'L', 'J', 'S', 'Z', 'O'], 1)
    ]);
    expect(parser.parse('{T=1}{L=1}')).toEqual([
      new FilterBlock(new CountLiteral(['T'], '=', 1)),
      new FilterBlock(new CountLiteral(['L'], '=', 1))
    ]);
    expect(parser.parse('[TIL]p2{L=1}')).toEqual([
      new GeneratorLiteral(['T', 'I', 'L'], 2),
      new FilterBlock(new CountLiteral(['L'], '=', 1))
    ]);
  });
});
