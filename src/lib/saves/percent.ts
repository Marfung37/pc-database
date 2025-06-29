import { Parser as WantedSavesParser, evaluateAst, type AST } from './parser';
import { SavesReader } from './savesReader';
import { Fraction } from './fraction';

// Utility function: anyIndex
export function anyIndex(seq: Iterable<boolean>): number {
  let i = 0;
  for (const val of seq) {
    if (val) return i;
    i++;
  }
  return -1;
}

export function percent(
  filepath: string,
  wantedSaves: string[],
  build: string, 
  leftover: string,
  pcNum: number, 
  twoline: boolean = false,
): Fraction[] {
  const saveableCounters: number[] = Array(wantedSaves.length).fill(0);
  let total: number = 0

  const wantedSavesParser = new WantedSavesParser() 
  const asts: AST[] = [];
  for (let wantedSave of wantedSaves) {
    asts.push(wantedSavesParser.parse(wantedSave));
  }

  const saveReader = new SavesReader(filepath, build, leftover, pcNum, twoline);

  for (let row of saveReader.read()) {
    // get first index that satisfies the save
    const index = anyIndex(asts.map((ast) => evaluateAst(ast, row.saves)))

    if (index != -1) {
      saveableCounters[index] += 1;
    }

    total += 1;
  }

  return saveableCounters.map((val) => new Fraction(val, total));
}
