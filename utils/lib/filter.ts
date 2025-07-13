import fsPromises from 'fs/promises';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { Parser as WantedSavesParser, evaluateAstAll, type AST } from './saves/parser';
import { SavesReader } from './saves/savesReader';
import { patternsToGraph, findMinimalNodes } from './saves/minimal';
import { Fraction } from './saves/fraction';
import { fumenCombine, fumenCombineComments } from './fumenUtils';
import { createObjectCsvWriter as createCsvWriter } from 'csv-writer';
import {
  COLUMN_QUEUE,
  COLUMN_FUMEN_COUNT,
  COLUMN_USED_PIECES,
  COLUMN_UNUSED_PIECES,
  COLUMN_FUMENS,
  COLUMN_FUMENS_DELIMITER
} from './constants';
import type { Queue, Fumen } from './types';
import type { pathRow } from './saves/types';

const currentFilePath = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const currentFileDir = path.dirname(currentFilePath);
const pathFilterFilepath = path.join(currentFileDir, 'path-filter', 'path-filter.jar');
const filteredPathFile = path.join(currentFileDir, 'tmp', 'path.csv');
const pathFilterOutput = path.join(currentFileDir, 'tmp', 'output.txt');

const execPromise = promisify(exec);

const NODE_LIMIT_HEURISTIC = 300; // heurestic on number of nodes that is maximum to expect the true minimal program to complete in a reasonable amount of time
const PATH_ITERATIONS = 3; // number of times path-filter is run to try to get a reasonable minimal set
const MAX_PATH_ITERATIONS = 5; // number of times running path-filter before giving it an error instead
const PATH_TIME_LIMIT = 30 * 60 * 1000; // 30 minute time limit
const MINIMAL_TIME_LIMIT = 10 * 60 * 1000; // 30 minute time limit

export interface FilterOutput {
  fractions: Fraction[],
  uniqueSolves?: Fumen,
  minimalSolves?: Fumen
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
  minimalSolves: boolean = true, 
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
      unionInPlace(uniqueFumens, new Set(newFumens));

    if (minimalSolves) {
      const newRow: pathRow = {
        pattern: row.queue, 
        fumens: newFumens
      }
      patterns.push(newRow);
    }
  }

  const returnData: FilterOutput = {
    fractions: saveableCounters.map((val) => new Fraction(val, total))
  }

  if (uniqueSolves && uniqueFumens.size > 0)
    returnData.uniqueSolves = fumenCombine(uniqueFumens);

  if (minimalSolves && patterns.length > 0) 
    returnData.minimalSolves = await generateMinimalSet(patterns, total);
  
  return returnData;
}

async function generateMinimalSet(patterns: pathRow[], total: number): Promise<Fumen> {
  const graph = patternsToGraph(patterns);

  // DEBUG
  console.log(`Edges ${graph.edges.length}, Nodes ${graph.nodes.length}`);

  let minimalSet: Fumen[];


  if (graph.nodes.length < NODE_LIMIT_HEURISTIC) {
    try {
      const {sets} = findMinimalNodes(graph.edges, MINIMAL_TIME_LIMIT);

      // TODO: decide if something better than pick arbitarily first set
      const set = sets[0];

      minimalSet = set.map(n => n.key) as Fumen[];
    } catch (e) {
      minimalSet = await runPathFilter(patterns);
    }
  } else {
    minimalSet = await runPathFilter(patterns);
  }

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

  const solutions = minimalSet.map(f => {
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
    const percent = f.numerator / f.denominator * 100;
    return `${percent.toFixed(2)}% (${f.numerator}/${f.denominator})`;
  })

  return fumenCombineComments(fumenOrder, labels);
}

async function writeFilteredPath(filepath: string, patterns: pathRow[]): Promise<void> {
  const csvWriter = createCsvWriter({
    path: filepath,
    header: [
      {id: 'pattern', title: COLUMN_QUEUE},
      {id: 'solutionCount', title: COLUMN_FUMEN_COUNT},
      {id: 'solutions', title: COLUMN_USED_PIECES},
      {id: 'unusedMinos', title: COLUMN_UNUSED_PIECES},
      {id: 'fumens', title: COLUMN_FUMENS}
    ]
  }); 

  const processedPatterns = patterns.map(record => ({
    ...record,
    solutionCount: record.fumens.length,
    fumens: record.fumens.join(COLUMN_FUMENS_DELIMITER)
  }))

  await csvWriter.writeRecords(processedPatterns);
}

async function runPathFilter(patterns: pathRow[]): Promise<Fumen[]> {
  const cmd = `java -jar ${pathFilterFilepath} ${filteredPathFile} ${pathFilterOutput} 5.0 6.0 3.0 100000`;
  const verifyCmd = `java -jar ${pathFilterFilepath} verify ${filteredPathFile} ${pathFilterOutput}`;
  let minimalSet: Fumen[] = [];
  let iterationCount = 0;
  let completedIterationCount = 0;
  const startTime = Date.now();

  await writeFilteredPath(filteredPathFile, patterns);

  // run path filter
  do {
    const { stderr: pathFilterErr } = await execPromise(cmd);

    if (pathFilterErr) throw pathFilterErr;

    const { stdout, stderr: pathFilterVerifyErr } = await execPromise(verifyCmd);

    if (pathFilterVerifyErr) throw pathFilterVerifyErr;

    if (stdout.match(/OK/) !== null) completedIterationCount++;
    iterationCount++;

    // read output
    const data = (await fsPromises.readFile(pathFilterOutput)).toString().trim().split('\n');
    console.log(`Finished iteration ${iterationCount} of path-filter with ${data.length} solves`);
    if (minimalSet.length == 0 || data.length < minimalSet.length) 
      minimalSet = data as Fumen[];

  } while (completedIterationCount < PATH_ITERATIONS && iterationCount < MAX_PATH_ITERATIONS && Date.now() - startTime < PATH_TIME_LIMIT);

  if (iterationCount >= MAX_PATH_ITERATIONS) {
    throw new Error("Exceeded expected number of iteration of running path-filter");
  }

  return minimalSet;
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
