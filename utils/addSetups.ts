import fsPromises from 'fs/promises';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { extendPieces } from './lib/pieces';
import { fumenGetMinos, isCongruentFumen, fumenMirror, fumenSplit } from './lib/fumenUtils';
import { mirrorQueue, sortQueue } from './lib/queueUtils';
import { piecesMirror } from './lib/piecesUtils';
import glueFumenModule from './lib/GluingFumens/src/lib/glueFumen';
import { generateSetupIDPrefix, getPrefix } from './lib/id';
import { PIECEVAL } from './lib/constants';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parse } from 'csv-parse/sync';
import type {
  Setup,
  SetupTranslation,
  Statistic,
  SetupVariant,
  SetupID,
  Kicktable,
  HoldType,
  Queue,
  Fumen
} from './lib/types';
import path from 'path';
import { fileURLToPath } from 'url';

const glueFumen = glueFumenModule.default;
const currentFilePath = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const currentFileDir = path.dirname(currentFilePath);
const sfinderPath = path.join(currentFileDir, 'sfinder', 'sfinder.jar');
const kicksPath = path.join(currentFileDir, 'sfinder', 'kicks');
const outputPath = path.join(currentFileDir, 'tmp');
const execPromise = promisify(exec);

// regex for sfinder percent command to get solve chance
const percentRegex = /^success = (\d+\.\d+)% \((\d+)\/(\d+)\)/m;

interface InputSetup {
  id: number;
  pc: number;
  leftover: Queue;
  type: string;
  cover_pattern: string;
  cover_description: string | null;
  fumen: Fumen;
  solve_pattern: string | null;
  parent_id: string[] | null;
  mirror?: number | null;
  credit: string | null;
  variants: Fumen | null;
}

interface SetupOQBLink {
  child_id: string;
  parent_id: string;
}

const is180: Record<string, boolean> = {
  srs: false,
  srs_plus: true,
  srsx: true,
  srs180: true,
  tetrax: true,
  asc: false,
  ars: false,
  none: false
};

/**
 * Checks if two already sorted arrays contain exactly the same elements.
 *
 * @param arr1 The first sorted array.
 * @param arr2 The second sorted array.
 * @returns True if both arrays contain the exact same elements in the same order, false otherwise.
 */
function areSortedArraysEqual<T>(arr1: T[], arr2: T[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false; // Found a mismatch
    }
  }

  return true;
}

/**
 * Calculates the multiset difference of two sorted queues (A \ B).
 * Assumes the input queues are already sorted.
 * @param q1 The first sorted queue.
 * @param q2 The second sorted queue.
 * @returns A new sorted queue representing the multiset difference.
 */
function multisetDifferenceSortedQueues(q1: Queue, q2: Queue): Queue {
  const result: string[] = [];
  let i = 0;
  let j = 0;

  while (i < q1.length && j < q2.length) {
    const charA = q1[i];
    const charB = q2[j];

    if (PIECEVAL[charA] < PIECEVAL[charB]) {
      // charA is in A but not in B. Add it to the result.
      result.push(charA);
      i++;
    } else if (PIECEVAL[charA] > PIECEVAL[charB]) {
      // charB is in B but not in A. Ignore it.
      j++;
    } else {
      // charA and charB are the same. "Cancel" them out.
      i++;
      j++;
    }
  }

  while (i < q1.length) {
    result.push(q1[i]);
    i++;
  }

  return result.join('') as Queue;
}

/**
 * Calculates the set difference between two Sets.
 * It returns a new array containing all elements from the first Set
 * that are not present in the second Set.
 *
 * @param set1 The first Set.
 * @param set2 The second Set.
 * @returns A new array with the elements that are in set1 but not in set2.
 */
function setDifference<T>(set1: Set<T>, set2: Set<T>): T[] {
  // Use a simple filter on the first Set to find elements not present in the second.
  // We first convert the Set to an array to use the filter method.
  return [...set1].filter((item) => !set2.has(item));
}

// TODO: possibly have setup on mirror if only adds coverage accept without mirror setup
function mirrorInputSetup(row: InputSetup, id: number): InputSetup | null {
  const leftover = sortQueue(mirrorQueue(row.leftover));
  const fumen = fumenMirror(row.fumen);
  const cover_pattern = piecesMirror(row.cover_pattern);

  if (
    leftover === row.leftover &&
    isCongruentFumen(fumen, row.fumen) &&
    areSortedArraysEqual(extendPieces(cover_pattern), extendPieces(row.cover_pattern))
  )
    return null;

  return {
    id,
    pc: row.pc,
    leftover,
    type: row.type,
    cover_pattern: piecesMirror(row.cover_pattern),
    cover_description: row.cover_description !== null ? piecesMirror(row.cover_description) : null,
    fumen,
    solve_pattern: row.solve_pattern !== null ? piecesMirror(row.solve_pattern) : null,
    parent_id: null,
    mirror: row.id,
    credit: row.credit,
    variants: row.variants !== null ? fumenMirror(row.variants) : null
  };
}

async function checkDuplicate(
  setup: Setup,
  stat: Statistic,
  otherSetups: Setup[],
  otherStats: Statistic[],
  kicktable: Kicktable,
  holdtype: HoldType
): Promise<SetupID | null> {
  if (otherSetups.length !== otherStats.length)
    throw new Error('Differing length of setups and stats passed to checkDuplicate');

  const prefix = getPrefix(setup.setup_id);

  const { data, error: setupErr } = await supabaseAdmin
    .from('setups')
    .select('setup_id, cover_pattern, fumen, solve_pattern, statistics!inner (solve_fraction)')
    .like('setup_id', prefix + '____')
    .eq('statistics.kicktable', kicktable)
    .eq('statistics.hold_type', holdtype)
    .like('setup_id', prefix + '%');

  if (setupErr) throw setupErr;

  for (let i = 0; i < otherSetups.length; i++) {
    // check if same prefix
    if (otherSetups[i].setup_id.startsWith(prefix)) {
      data.push({
        ...otherSetups[i],
        statistics: [otherStats[i]]
      });
    }
  }
  if (data.length == 0) return null;

  const coverQueues: Set<Queue> = new Set(extendPieces(setup.cover_pattern) as Queue[]);
  const solveQueues: Queue[] | null = setup.solve_pattern
    ? (extendPieces(setup.solve_pattern) as Queue[])
    : null;
  for (let row of data) {
    // congruent fumen up to shifts
    if (!isCongruentFumen(setup.fumen, row.fumen, 1)) continue;
    // exactly same solve queues
    if (solveQueues === null && row.solve_pattern !== null) continue;
    if (solveQueues !== null && !areSortedArraysEqual(solveQueues, extendPieces(row.solve_pattern)))
      continue;
    // same solve fraction
    if (stat.solve_fraction === null && row.statistics[0].solve_fraction !== null) continue;
    if (
      stat.solve_fraction !== null &&
      !(
        stat.solve_fraction.numerator === row.statistics[0].solve_fraction.numerator &&
        stat.solve_fraction.denominator === row.statistics[0].solve_fraction.denominator
      )
    )
      continue;

    const otherCoverQueues: Set<Queue> = new Set(extendPieces(row.cover_pattern) as Queue[]);

    // check if one of the sets is a subset of other
    if (
      !(
        setDifference(coverQueues, otherCoverQueues).length === 0 ||
        setDifference(otherCoverQueues, coverQueues).length === 0
      )
    )
      continue;

    return row.setup_id;
  }

  return null;
}

async function generateSetupID(
  row: Omit<InputSetup, 'id'>,
  prefixCount: Map<string, number>,
  build: Queue
): Promise<SetupID> {
  const prefix = generateSetupIDPrefix(row.pc, row.type === 'oqb', row.leftover, build, row.fumen);

  const currentCount = prefixCount.get(prefix) || 0;
  prefixCount.set(prefix, currentCount + 1);

  const { data: setupids, error: setupidErr } = await supabaseAdmin
    .from('setups')
    .select('setup_id')
    .like('setup_id', prefix + '___');

  if (setupidErr) throw setupidErr;

  return (prefix + (0xfff - setupids.length - currentCount).toString(16)) as SetupID;
}

async function generateSetupEntry(
  row: InputSetup,
  prefixCount: Map<string, number>,
  mirror: SetupID | null,
  see: number,
  hold: number
): Setup {
  // compute the build
  const gluedFumens = glueFumen(row.fumen, 1);

  let buildTmp = '';
  for (let mino of fumenGetMinos(gluedFumens[0])) {
    buildTmp += mino.type;
  }
  const build = sortQueue(buildTmp as Queue);

  // compute the setupid
  let setup_id = await generateSetupID(row, prefixCount, build);

  return {
    setup_id,
    pc: row.pc,
    leftover: row.leftover,
    build,
    type: row.type,
    cover_pattern: row.cover_pattern,
    fumen: row.fumen,
    solve_pattern: row.solve_pattern,
    mirror,
    see,
    hold,
    credit: row.credit
  };
}

function generateVariantEntry(setup: Setup, variantsFumen: Fumen): SetupVariant[] {
  const variants: SetupVariant[] = [];

  for (let fumen of fumenSplit(variantsFumen)) {
    const gluedFumen = glueFumen(fumen, 1)[0];

    let buildTmp = '';
    for (let mino of fumenGetMinos(gluedFumen)) {
      buildTmp += mino.type;
    }
    const build = sortQueue(buildTmp as Queue);

    const regex = /(?<=\[\^)([TILJSZO]+)(?=\](?:!|p\d)$)/;
    const matchObj = setup.solve_pattern.match(regex);
    if (matchObj === null)
      throw new Error(
        `Solve pattern for ${setup.setup_id} doesn't end in the expected way for variants`
      );

    const newPiecesUsed = sortQueue(
      matchObj[1] + multisetDifferenceSortedQueues(build, setup.build)
    );

    const solve_pattern = setup.solve_pattern.replace(regex, newPiecesUsed);

    variants.push({
      setup_id: setup.setup_id,
      build,
      fumen,
      solve_pattern
    });
  }

  return variants;
}

async function generateStatEntry(
  setup: Setup,
  variants: SetupVariant[],
  kicktable: Kicktable,
  holdtype: HoldType
): Promise<Statistic> {
  const coverFilename = setup.setup_id + '.csv';
  const patternFilename = setup.setup_id + '.txt';
  const kickFilename = path.join(kicksPath, kicktable + '.properties');
  const drop = is180[kicktable] ? '180' : 'soft';
  const output = path.join(outputPath, coverFilename);
  const patternPath = path.join(outputPath, patternFilename);
  const cmdBase = (cmd: string) =>
    `java -jar ${sfinderPath} ${cmd} -pp ${patternPath} -K ${kickFilename} -d ${drop}`;

  // run cover
  await fsPromises.writeFile(patternPath, extendPieces(setup.cover_pattern).join('\n'));

  const fumens = [setup.fumen, ...variants.map((v: SetupVariant) => v.fumen)];
  const glueFumens = glueFumen(fumens).join(' ');

  const coverCmd = cmdBase('cover') + ` -t ${glueFumens} -o ${output}`;

  const { stderr: coverErr } = await execPromise(coverCmd);

  if (coverErr) throw coverErr;

  const coverContent = await fsPromises.readFile(output, { encoding: 'utf8' });
  const csvContent = parse(coverContent, {
    columns: false,
    skip_empty_lines: true
  }).slice(1); // skip the header row
  await fsPromises.unlink(output);

  // converts the data in the cover file to a byte array
  let coverData: Uint8Array | null = new Uint8Array((csvContent.length + 7) / 8);
  let bitToByte: number = 0;
  let anyFails: boolean = false;
  for (let i = 0; i < csvContent.length; i++) {
    const covered = csvContent[i].slice(1).includes('O');
    if (!covered) anyFails = true;
    bitToByte |= covered << (7 - (i % 8));
    // once a full byte is completed
    if (i % 8 == 7) {
      coverData[(i - 7) / 8] = bitToByte;
      bitToByte = 0;
    }
  }
  if (!anyFails) {
    coverData = null;
  } else if (bitToByte > 0) {
    // fill last space if a full byte isn't fully filled
    coverData[coverData.length - 1] = bitToByte;
  }

  // if no solve pattern then don't calculate solve percent
  if (setup.solve_pattern === null) {
    return {
      setup_id: setup.setup_id,
      kicktable,
      hold_type: holdtype,
      cover_data: coverData,
      solve_percent: null,
      solve_fraction: null,
      all_solves: null,
      minimal_solves: null,
      path_file: false
    };
  }

  // run percent
  await fsPromises.writeFile(patternPath, extendPieces(setup.solve_pattern).join('\n'));

  const percentCmd = cmdBase('percent') + ` -t ${setup.fumen}`;

  const { stdout: percentOut, stderr: percentErr } = await execPromise(percentCmd);

  if (percentErr) throw percentErr;

  const match = percentOut.match(percentRegex);

  await fsPromises.unlink(patternPath);

  if (match === null) {
    throw new Error(`Fail to get the solve percent of the setup`);
  }

  const percent = parseFloat(match[1]); // Convert the captured string to a number
  const numerator = parseInt(match[2], 10); // Convert to integer
  const denominator = parseInt(match[3], 10); // Convert to integer

  return {
    setup_id: setup.setup_id,
    kicktable,
    hold_type: holdtype,
    cover_data: coverData,
    solve_percent: percent,
    solve_fraction: { numerator, denominator },
    all_solves: null,
    minimal_solves: null,
    path_file: false
  };
}

async function parseSetupInput(
  filepath: string,
  see: number = 7,
  hold: number = 1,
  kicktable: Kicktable = 'srs180',
  holdtype: HoldType = 'any'
) {
  const data = await fsPromises.readFile(filepath, { encoding: 'utf8' });
  const csvData = parse(data, {
    columns: true,
    cast: (value, { column, lines }) => {
      if (column === 'id') {
        if (value === '') throw new Error(`Parse error: 'id' column is empty in row ${lines}`);
        return parseInt(value);
      }
      if (column === 'pc') {
        if (value === '') throw new Error(`Parse error: 'pc' column is empty in row ${lines}`);
        return parseInt(value);
      }
      if (column === 'leftover') {
        if (value === '')
          throw new Error(`Parse error: 'leftover' column is empty in row ${lines}`);
        return value as Queue;
      }
      if (column === 'cover_pattern' && value === '') {
        throw new Error(`Parse error: 'cover_pattern' column is empty in row ${lines}`);
      }
      if (column === 'fumen') {
        if (value === '') throw new Error(`Parse error: 'fumen' column is empty in row ${lines}`);
        return value as Fumen;
      }
      if (column === 'mirror') {
        if (value === 'null') return null;
        return value ? parseInt(value) : undefined;
      }
      if (column === 'variants') {
        return value ? (value as Fumen) : null;
      }
      if (column === 'parent_id') {
        return value ? value.split(',').map((v) => parseInt(v)) : null;
      }
      return value ? value : null;
    }
  });

  const mirrorChecked: boolean[] = Array.from({ length: csvData.length }, () => false);

  // add mirror setups and setting parent ids
  let originalLength = csvData.length;
  let foundSomething = false;
  while (mirrorChecked.some((b) => !b)) {
    foundSomething = false;
    for (let i = 0; i < originalLength; i++) {
      if (mirrorChecked[i]) continue;

      const row = csvData[i];

      let safeToCheck =
        row.parent_id === null || row.parent_id.every((id: string) => id in mirrorChecked);
      if (!safeToCheck) continue;
      if (row.mirrorChecked !== undefined) {
        mirrorChecked[i] = true;
        continue;
      }

      const mirrorRow = mirrorInputSetup(row, csvData.length);
      if (mirrorRow !== null) {
        if (row.parent_id !== null) {
          // TODO: check if parent_id is type oqb, if not error
          mirrorRow.parent_id = row.parent_id
            .map((id: number) => csvData[id].mirror)
            .filter((id: number | null) => id !== null);
        }
        csvData.push(mirrorRow);
        row.mirror = mirrorRow.id;
      } else {
        row.mirror = null;
      }
      mirrorChecked[i] = true;
      foundSomething = true;
    }

    if (!foundSomething) {
      const falseIds: number[] = [];

      for (const [index, value] of mirrorChecked.entries()) {
        if (!value) falseIds.push(index);
      }

      throw Error(
        `Setups ${falseIds} were unable to determine if mirror is needed due to possibly circular dependency in parent_id`
      );
    }
  }

  const setups: Setup[] = [];
  const setupTranslations: SetupTranslation[] = [];
  const setupVariants: SetupVariant[] = [];
  const setupLinks: SetupOQBLink[] = [];
  const stats: Statistic[] = [];

  const setupsDuplicate: Set<SetupID> = new Set();
  const prefixCount: Map<string, number> = new Map();
  const idMap: (SetupID | null)[] = Array.from({ length: csvData.length }, () => null);

  while (idMap.some((id) => id === null)) {
    foundSomething = false;
    for (let row of csvData) {
      if (idMap[row.id] !== null) continue;

      let safeToCheck =
        row.parent_id === null || row.parent_id.every((id: number) => idMap[id] !== null);
      if (!safeToCheck) continue;

      const setup = await generateSetupEntry(row, prefixCount, null, see, hold);

      let variants: SetupVariant[] = [];
      if (row.variants !== null) {
        variants = generateVariantEntry(setup, row.variants);
      }

      // compute the stats
      const stat = await generateStatEntry(setup, variants, kicktable, holdtype);

      // DEBUG
      if (stat.cover_data !== null) console.log(`Row ${row.id} does not have full coverage`);

      const duplicateSetupid = await checkDuplicate(
        setup,
        stat,
        setups,
        stats,
        kicktable,
        holdtype
      );
      if (duplicateSetupid !== null) {
        console.log(
          `Setup ${row.id} is a duplicate of ${duplicateSetupid} with possibly different cover pattern`
        );
        setup.setup_id = duplicateSetupid; // kept in case child isn't duplicate so link is made with existing setup
        setupsDuplicate.add(setup.setup_id);
      }

      if (row.parent_id !== null && duplicateSetupid === null) {
        for (const id of row.parent_id) {
          if (idMap[id] === null)
            throw Error(`Somehow parent id ${id} isn\'t mapped for setup ${row.id}`);

          const link = {
            child_id: setup.setup_id,
            parent_id: idMap[id]
          };

          setupLinks.push(link);
        }
      }

      idMap[row.id] = setup.setup_id;
      setups.push(setup);
      setupTranslations.push({
        setup_id: setup.setup_id,
        language: 'en',
        cover_description: row.cover_description
      });
      stats.push(stat);
      setupVariants.push(...variants);
      foundSomething = true;
    }

    if (!foundSomething) {
      const falseIds: number[] = [];

      for (const [index, value] of idMap.entries()) {
        if (value === null) falseIds.push(index);
      }

      throw Error(`Setups ${falseIds} didn't have their ids`);
    }
  }

  for (let i = 0; i < setups.length; i++) {
    if (csvData[i].mirror !== null && idMap[csvData[i].mirror] !== null) {
      console.log(setups[i].mirror, csvData[i].mirror, idMap[csvData[i].mirror]);
      setups[i].mirror = idMap[csvData[i].mirror];
    }
  }

  console.log(setups, setupLinks, stats, setupVariants);
}

await parseSetupInput('utils/test.csv');
