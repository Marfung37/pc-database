import { Parser as WantedSavesParser, evaluateAstAll, type AST } from './saves/parser';
import { SavesReader } from './saves/savesReader';
import { solveSetCover } from './minimal';
import { Fraction } from './saves/fraction';
import { fumenCombine, fumenCombineComments } from './fumenUtils';
import type { Queue, Fumen } from './types';

export interface FilterOutput {
  fractions: Fraction[];
  uniqueSolves?: Fumen;
  minimalSolves?: Fumen;
}

export async function filter(
  wantedSaves: string[],
  build: Queue,
  leftover: Queue,
  pcNum: number,
  filepath: string | null = null,
  fileData: string | null = null,
  twoline: boolean = false,
  uniqueSolves: boolean = false,
  minimalSolves: boolean = true
): Promise<FilterOutput> {
  const saveableCounters: number[] = Array(wantedSaves.length).fill(0);
  const uniqueFumens: Set<Fumen> = new Set();
  let total = 0;

  const wantedSavesParser = new WantedSavesParser();
  const asts: AST[] = [];
  for (let wantedSave of wantedSaves) {
    asts.push(wantedSavesParser.parse(wantedSave));
  }

  if (fileData === null && filepath === null) {
    throw new Error('Either filepath or records must be filled for percent');
  }

  const saveReader = new SavesReader(build, leftover, pcNum, filepath, fileData, twoline);

  const queues: Queue[] = [];
  const fumens: Set<Fumen> = new Set();
  const queueToFumens: Map<Queue, Fumen[]> = new Map();

  for (let row of saveReader.read(true, true)) {
    total++;

    if (!row.solveable) continue; // skip rows not solveable
    if (row.fumens === undefined)
      throw new Error('Expected fumens to be populated from save reader');
    if (row.line === undefined) throw new Error('Expected line to be populated from save reader');

    let indicies: number[] = [];
    let i = 0;
    for (let ast of asts) {
      // get all indicies that work
      indicies = evaluateAstAll(ast, row.saves);
      if (indicies.length > 0) {
        saveableCounters[i]++;
        break;
      }
      i++;
    }
    if (i == asts.length) continue; // no save worked

    const newFumens: Fumen[] = [];
    for (let i of indicies) {
      newFumens.push(...row.fumens[i]);
    }

    if (uniqueSolves) unionInPlace(uniqueFumens, new Set(newFumens));

    if (minimalSolves) {
      queues.push(row.queue as Queue);
      newFumens.forEach(item => fumens.add(item));
      queueToFumens.set(row.queue as Queue, newFumens);
    }
  }

  const returnData: FilterOutput = {
    fractions: saveableCounters.map((val) => new Fraction(val, total))
  };

  if (uniqueSolves && uniqueFumens.size > 0) returnData.uniqueSolves = fumenCombine(uniqueFumens);

  if (minimalSolves && queues.length > 0) {
    const minimalData = await generateMinimalSet(
      queues,
      fumens,
      queueToFumens,
      total
    );
    returnData.minimalSolves = minimalData;
  }

  return returnData;
}

export async function generateMinimalSet(
  queues: Queue[],
  fumens: Set<Fumen>,
  queueToFumens: Map<Queue, Fumen[]>,
  total: number,
): Promise<Fumen> {

  const solution = solveSetCover(queues, Array.from(fumens), queueToFumens);

  if (solution.selected == null || solution.status !== "Optimal") {
    throw new Error(`Unable to find minimal set due to ${solution.status}`);
  }

  const solutionMap = new Map();
  for (const queue of queueToFumens.keys()) {
    for (const fumen of queueToFumens.get(queue)) {
      let sol = solutionMap.get(fumen);
      if (!sol) {
        sol = {
          fumen,
          patterns: []
        };
        solutionMap.set(fumen, sol);
      }
      sol.patterns.push(queue);
    }
  }

  const solutions = solution.selected.map((f) => {
    const sol = solutionMap.get(f);
    return {
      fumen: sol.fumen,
      patterns: new Set<Queue>(sol.patterns)
    };
  });

  // compute the cumulative percents
  const cumuFractions: Fraction[] = [];
  const fumenOrder: Fumen[] = [];
  const indiciesUsed: Set<number> = new Set();
  const queueCoveredSet: Set<Queue> = new Set();

  for (let i = 0; i < solutions.length; i++) {
    let largestSize = 0;
    let largestIndex = -1;
    for (let j = 0; j < solutions.length; j++) {
      if (indiciesUsed.has(j)) continue;
      const size = setDifference(solutions[i].patterns, queueCoveredSet).size;
      if (size > largestSize) {
        largestSize = size;
        largestIndex = j;
      }
    }
    unionInPlace(queueCoveredSet, solutions[largestIndex].patterns);
    indiciesUsed.add(largestIndex);
    const fraction = new Fraction(queueCoveredSet.size, total);
    cumuFractions.push(fraction);
    fumenOrder.push(solutions[largestIndex].fumen);
  }

  const labels = cumuFractions.map((f: Fraction) => {
    const percent = (f.numerator / f.denominator) * 100;
    return `${percent.toFixed(2)}% (${f.numerator}/${f.denominator})`;
  });

  return fumenCombineComments(fumenOrder, labels);
}

function unionInPlace<T>(target: Set<T>, other: Set<T>): void {
  for (const item of other) {
    target.add(item);
  }
}

function setDifference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
  const difference = new Set<T>();
  for (const item of setA) {
    if (!setB.has(item)) {
      difference.add(item);
    }
  }
  return difference;
}
