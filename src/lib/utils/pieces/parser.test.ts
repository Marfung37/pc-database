import { describe, test, expect } from 'vitest';
import { Parser } from './parser';
import { ASTNode } from './defines';
const parser = new Parser();

describe('pieces parser', () => {
  test('parsing generator expressions', () => {
    expect(parser.parse('T')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T'], permute: 1 }
    ]);
    expect(parser.parse('L')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L'], permute: 1 }
    ]);
    expect(parser.parse('*')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 1 }
    ]);
    expect(parser.parse('[TILJSZO]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 1 }
    ]);
    expect(parser.parse('[TI]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I'], permute: 1 }
    ]);
    expect(parser.parse('[SIJ]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['I', 'J', 'S'], permute: 1 }
    ]);
    expect(parser.parse('*p2')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 2 }
    ]);
    expect(parser.parse('*p6')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 6 }
    ]);
    expect(parser.parse('*!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 7 }
    ]);
    expect(parser.parse('[TI]p2')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I'], permute: 2 }
    ]);
    expect(parser.parse('[TI]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I'], permute: 2 }
    ]);
    expect(parser.parse('[SIJ]p2')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['I', 'J', 'S'], permute: 2 }
    ]);
    expect(parser.parse('[SIJ]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['I', 'J', 'S'], permute: 3 }
    ]);
    expect(parser.parse('[TTI]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'T', 'I'], permute: 1 }
    ]);
    expect(parser.parse('[TTI]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'T', 'I'], permute: 3 }
    ]);
    expect(parser.parse('[ITT]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'T', 'I'], permute: 3 }
    ]);
    expect(parser.parse('[^TIJ]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'S', 'Z', 'O'], permute: 1 }
    ]);
    expect(parser.parse('[^TIJ]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'S', 'Z', 'O'], permute: 4 }
    ]);
    expect(parser.parse('[^JTI]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'S', 'Z', 'O'], permute: 4 }
    ]);
    expect(parser.parse('[L[SZ]]')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'SZ'], permute: 1 }
    ]);
    expect(parser.parse('[L[SZ]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'SZ'], permute: 2 }
    ]);
    expect(parser.parse('[[TI]L[SZ]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'TI', 'SZ'], permute: 3 }
    ]);
    expect(parser.parse('[L[^SZ]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'TILJO'], permute: 2 }
    ]);
    expect(parser.parse('[^TI[LJ]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'J', 'S', 'Z', 'O', 'LJ'], permute: 6 }
    ]);
    expect(parser.parse('[^TILJSZ[O]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['O', 'O'], permute: 2 }
    ]);
    expect(parser.parse('[^TIJ[^LJO]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['L', 'S', 'Z', 'O', 'TISZ'], permute: 5 }
    ]);
    expect(parser.parse('[^TILJSZ[^O]]!')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['O', 'TILJSZ'], permute: 2 }
    ]);
  });

  test('parsing filter expressions', () => {
    expect(parser.parse('{T=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '=', count: 1 }
      }
    ]);
    expect(parser.parse('{T!=1 }')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '!=', count: 1 }
      }
    ]);
    expect(parser.parse('{T >1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '>', count: 1 }
      }
    ]);
    expect(parser.parse('{T< 1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '<', count: 1 }
      }
    ]);
    expect(parser.parse('{ T>=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '>=', count: 1 }
      }
    ]);
    expect(parser.parse('{ T <=  1 }')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '<=', count: 1 }
      }
    ]);
    expect(parser.parse('{1:T=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.RangeLookup,
          start: 0,
          end: 1,
          expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '=', count: 1 }
        }
      }
    ]);
    expect(parser.parse('{1-2:T=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.RangeLookup,
          start: 1,
          end: 2,
          expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '=', count: 1 }
        }
      }
    ]);
    expect(parser.parse('{/^T/}')).toEqual([
      { type: ASTNode.FilterBlock, expr: { type: ASTNode.RegexLiteral, value: /^T/ } }
    ]);
    expect(parser.parse('{1:/^T/}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.RangeLookup,
          start: 0,
          end: 1,
          expr: { type: ASTNode.RegexLiteral, value: /^T/ }
        }
      }
    ]);
    expect(parser.parse('{T<L}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.BeforeLiteral, beforePieces: ['T'], afterPieces: ['L'] }
      }
    ]);
    expect(parser.parse('{IT<[LJ]}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.BeforeLiteral, beforePieces: ['I', 'T'], afterPieces: ['LJ'] }
      }
    ]);
    expect(parser.parse('{3:T<L}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.RangeLookup,
          start: 0,
          end: 3,
          expr: { type: ASTNode.BeforeLiteral, beforePieces: ['T'], afterPieces: ['L'] }
        }
      }
    ]);
    expect(parser.parse('{[LJ]=1&&!LJ=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.BinaryOp,
          left: {
            type: ASTNode.CountLiteral,
            pieces: ['LJ'],
            op: '=',
            count: 1
          },
          op: 'AND',
          right: {
            type: ASTNode.UnaryOp,
            op: 'NOT',
            expr: {
              type: ASTNode.CountLiteral,
              pieces: ['L', 'J'],
              op: '=',
              count: 1
            }
          }
        }
      }
    ]);
    expect(parser.parse('{([LJ]=1&&!LJ=1)||LJ=0}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: {
          type: ASTNode.BinaryOp,
          left: {
            type: ASTNode.BinaryOp,
            left: {
              type: ASTNode.CountLiteral,
              pieces: ['LJ'],
              op: '=',
              count: 1
            },
            op: 'AND',
            right: {
              type: ASTNode.UnaryOp,
              op: 'NOT',
              expr: {
                type: ASTNode.CountLiteral,
                pieces: ['L', 'J'],
                op: '=',
                count: 1
              }
            }
          },
          op: 'OR',
          right: { type: ASTNode.CountLiteral, pieces: ['L', 'J'], op: '=', count: 0 }
        }
      }
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
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 1 },
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L', 'J', 'S', 'Z', 'O'], permute: 1 }
    ]);
    expect(parser.parse('{T=1}{L=1}')).toEqual([
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['T'], op: '=', count: 1 }
      },
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['L'], op: '=', count: 1 }
      }
    ]);
    expect(parser.parse('[TIL]p2{L=1}')).toEqual([
      { type: ASTNode.GeneratorLiteral, pool: ['T', 'I', 'L'], permute: 2 },
      {
        type: ASTNode.FilterBlock,
        expr: { type: ASTNode.CountLiteral, pieces: ['L'], op: '=', count: 1 }
      }
    ]);
  });
});
