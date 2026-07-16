import { describe, test, expect } from 'vitest';
import { Parser } from './parser';
import { tetrisCompare, type GeneratorLiteral } from './defines';
import { evaluateGenerator } from './evaluateGenerator';
const parser = new Parser();

function helper(expression: string): string[] {
  return evaluateGenerator(parser.parse(expression)[0] as GeneratorLiteral);
}

describe('generator evaluation', () => {
  test('length', () => {
    expect(helper('T').length).toBe(1);
    expect(helper('I').length).toBe(1);
    expect(helper('L').length).toBe(1);
    expect(helper('J').length).toBe(1);
    expect(helper('S').length).toBe(1);
    expect(helper('Z').length).toBe(1);
    expect(helper('O').length).toBe(1);
    expect(helper('*').length).toBe(7);
    expect(helper('[TS]').length).toBe(2);
    expect(helper('[LSO]').length).toBe(3);
    expect(helper('[TT]').length).toBe(1);
    expect(helper('[TTI]').length).toBe(2);
    expect(helper('[TS]!').length).toBe(2);
    expect(helper('[LSO]!').length).toBe(6);
    expect(helper('[LSO]p2').length).toBe(6);
    expect(helper('[LSO]p2').length).toBe(6);
    expect(helper('*p2').length).toBe(42);
    expect(helper('*p7').length).toBe(5040);
    expect(helper('[[TS]]').length).toBe(2);
    expect(helper('[I[TS]]').length).toBe(3);
    expect(helper('[T[TS]]').length).toBe(2);
    expect(helper('[T[TS]]p2').length).toBe(3);
  });

  test('sorting', () => {
    expect(helper('T')).toEqual(helper('T').sort(tetrisCompare));
    expect(helper('I')).toEqual(helper('I').sort(tetrisCompare));
    expect(helper('L')).toEqual(helper('L').sort(tetrisCompare));
    expect(helper('J')).toEqual(helper('J').sort(tetrisCompare));
    expect(helper('S')).toEqual(helper('S').sort(tetrisCompare));
    expect(helper('Z')).toEqual(helper('Z').sort(tetrisCompare));
    expect(helper('O')).toEqual(helper('O').sort(tetrisCompare));
    expect(helper('*')).toEqual(helper('*').sort(tetrisCompare));
    expect(helper('[TS]')).toEqual(helper('[TS]').sort(tetrisCompare));
    expect(helper('[LSO]')).toEqual(helper('[LSO]').sort(tetrisCompare));
    expect(helper('[TT]')).toEqual(helper('[TT]').sort(tetrisCompare));
    expect(helper('[TTI]')).toEqual(helper('[TTI]').sort(tetrisCompare));
    expect(helper('[TS]!')).toEqual(helper('[TS]!').sort(tetrisCompare));
    expect(helper('[LSO]!')).toEqual(helper('[LSO]!').sort(tetrisCompare));
    expect(helper('[LSO]p2')).toEqual(helper('[LSO]p2').sort(tetrisCompare));
    expect(helper('[LSO]p2')).toEqual(helper('[LSO]p2').sort(tetrisCompare));
    expect(helper('*p2')).toEqual(helper('*p2').sort(tetrisCompare));
    expect(helper('*p7')).toEqual(helper('*p7').sort(tetrisCompare));
    expect(helper('[[TS]]')).toEqual(helper('[[TS]]').sort(tetrisCompare));
    expect(helper('[I[TS]]')).toEqual(helper('[I[TS]]').sort(tetrisCompare));
    expect(helper('[T[TS]]')).toEqual(helper('[T[TS]]').sort(tetrisCompare));
    expect(helper('[T[TS]]p2')).toEqual(helper('[T[TS]]p2').sort(tetrisCompare));
  });
});
