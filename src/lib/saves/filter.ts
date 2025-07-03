import { Parser as WantedSavesParser, evaluateAstAll, type AST } from './parser';
import { SavesReader } from './savesReader';
import { patternsToGraph, findMinimalNodes } from './minimal';
import { Fraction } from './fraction';
import { fumenCombine, fumenCombineComments } from '$lib/utils/fumenUtils';
import type { Queue, Fumen } from '$lib/types';
import type { pathRow } from './types';

interface filterOutput {
  fractions: Fraction[],
  uniqueSolves?: Fumen,
  minimalSolves?: Fumen
}

export function filter(
  wantedSaves: string[],
  build: Queue,
  leftover: Queue,
  pcNum: number,
  filepath: string | null = null,
  fileData: string | null = null,
  twoline: boolean = false,
  uniqueSolves: boolean = false, 
  minimalSolves: boolean = true, 
): filterOutput {
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

  const patterns: pathRow[] = [];

  for (let row of saveReader.read(true, true)) {
    total++;

    if (!row.solveable) continue; // skip rows not solveable
    if (row.fumens === undefined) throw new Error("Expected fumens to be populated from save reader")
    if (row.line === undefined) throw new Error("Expected line to be populated from save reader")

    let indicies: number[] = [];
    let i = 0;
    for (let ast of asts) {
      // get all indicies that work
      indicies = evaluateAstAll(ast, row.saves);
      if (indicies.length > 0) {
        saveableCounters[i]++;
        break
      }
      i++;
    }
    if (i == asts.length) continue; // no save worked

    const newFumens: Fumen[] = [];
    for (let i of indicies) {
      newFumens.push(...row.fumens[i]);
    }

    if (uniqueSolves)
      uniqueFumens.union(new Set(newFumens))

    if (minimalSolves) {
      const newRow: pathRow = {
        pattern: row.queue, 
        fumens: newFumens
      }
      patterns.push(newRow);
    }
  }

  const returnData: filterOutput = {
    fractions: saveableCounters.map((val) => new Fraction(val, total))
  }

  if (uniqueSolves && uniqueFumens.size > 0)
    returnData.uniqueSolves = fumenCombine(uniqueFumens);

  if (minimalSolves && patterns.length > 0) 
    returnData.minimalSolves = generateMinimalSet(patterns, total);
  
  return returnData;
}

function unionInPlace<T>(target: Set<T>, other: Set<T>): void {
  for (const item of other) {
    target.add(item);
  }
}

function generateMinimalSet(patterns: pathRow[], total: number): Fumen {
  const graph = patternsToGraph(patterns);

  const {sets} = findMinimalNodes(graph.edges);

  // TODO: decide if something better than pick arbitarily first set
  const set = sets[0];

  const solutionMap = new Map();
  for (const pattern of patterns) {
    for (const fumen of pattern.fumens) {
      let sol = solutionMap.get(fumen);
      if (!sol) {
        sol = {
          fumen,
          patterns: []
        };
        solutionMap.set(fumen, sol);
      }
      sol.patterns.push(pattern.pattern);
    }
  }

  const solutions = set.map(n => {
    const sol = solutionMap.get(n.key);
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
      const size = solutions[i].patterns.difference(queueCoveredSet).size;
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
    const percent = f.numerator / f.denominator * 100;
    return `${percent.toFixed(2)}% (${f.numerator}/${f.denominator})`;
  })

  return fumenCombineComments(fumenOrder, labels);
}
