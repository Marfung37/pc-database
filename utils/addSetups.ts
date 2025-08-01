import fsPromises from 'fs/promises';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { extendPieces } from './lib/pieces';
import { fumenGetMinos, isCongruentFumen } from './lib/fumenUtils';
import { sortQueue } from './lib/queueUtils';
import glueFumenModule from './lib/GluingFumens/src/lib/glueFumen';
import { generateSetupIDPrefix } from './lib/id';
import { exec } from 'child_process';
import { promisify } from 'util';
import { parse } from 'csv-parse/sync';
import type { Setup, Statistic, SetupOQBLink, SetupID, Kicktable, HoldType, Queue, Fumen } from './lib/types';
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
const percentRegex = /^success = (\d+\.\d+)% \((\d+)\/(\d+)\)/m

interface InputSetup {
  id: number,
  pc: number,
  leftover: Queue,
  cover_pattern: string,
  cover_description?: string,
  fumen: Fumen,
  solve_pattern: string,
  children?: number,
  mirror?: number,
  credit?: string
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

function getPrefix(setupid: SetupID): string {
  return setupid.slice(0, -2);
}

function getNoHashPrefix(setupid: SetupID): string {
  return setupid.slice(0, -4);
}

function getNoHashPrefixRegex(setupid: SetupID): string {
  const lastPart = parseInt(setupid[setupid.length - 4], 16) & 0b1100;
  return '^' + getNoHashPrefix(setupid) + `[${lastPart.toString(16)}-${(lastPart + 3).toString(16)}]`
}

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

// TODO: duplicate detection
async function checkDuplicate(setup: Setup, stat: Statistic, otherSetups: Setup[], otherStats: Statistic[], kicktable: Kicktable, holdtype: HoldType): Promise<SetupID | null> {
  if (otherSetups.length !== otherStats.length)
    throw new Error("Differing length of setups and stats passed to checkDuplicate")

  const prefix = getNoHashPrefix(setup.setup_id);
  const regexStr = getNoHashPrefixRegex(setup.setup_id)
  const regex = new RegExp(regexStr);

  const {data, error: setupErr} = await supabaseAdmin
    .from('setups')
    .select('setup_id, cover_pattern, fumen, solve_pattern, statistics!inner (solve_fraction)')
    .like('setup_id', prefix + '____')
    .eq('statistics.kicktable', kicktable)
    .eq('statistics.hold_type', holdtype)
    .filter('setup_id', 'match', regexStr)

  if (setupErr) throw setupErr;

  for (let i = 0; i < otherSetups.length; i++) {
    // check if same prefix
    if (otherSetups[i].setup_id.match(regex)) {
      data.push({
        ...otherSetups[i],
        statistics: [otherStats[i]]
      })
    }
  }
  if (data.length == 0) return null;

  const coverQueues: Queue[] = extendPieces(setup.cover_pattern) as Queue[];
  const solveQueues: Queue[] | null = (setup.solve_pattern) ? extendPieces(setup.solve_pattern) as Queue[]: null;
  for (let row of data) {
    // congruent fumen up to shifts
    if (!isCongruentFumen(setup.fumen, row.fumen, 1)) continue;
    // exactly same solve queues
    if (solveQueues === null && row.solve_pattern !== null) continue;
    if (solveQueues !== null && !areSortedArraysEqual(solveQueues, extendPieces(row.solve_pattern))) continue;
    // same solve fraction
    if (stat.solve_fraction === null && row.statistics[0].solve_fraction !== null) continue;
    if (stat.solve_fraction !== null &&
       !(stat.solve_fraction.numerator === row.statistics[0].solve_fraction.numerator && 
       stat.solve_fraction.denominator === row.statistics[0].solve_fraction.denominator))
      continue;

    // check the cover queues to note
    if (!areSortedArraysEqual(coverQueues, extendPieces(row.cover_pattern))) {
      // TODO: consider how to note better
      console.log(`Differing cover patterns but otherwise same setup: ${setup.setup_id} & ${row.setup_id}`);
    }
    return row.setup_id;
  }

  return null;
}

async function generateSetupID(row: InputSetup, prefixCount: Map<string, number>, oqb: boolean, build: Queue): Promise<SetupID> {
  const prefix = generateSetupIDPrefix(row.pc, oqb, row.leftover, build, row.cover_pattern, row.fumen);

  const currentCount = prefixCount.get(prefix) || 0;
  prefixCount.set(prefix, currentCount + 1);

  const {data: setupids, error: setupidErr} = await supabaseAdmin
    .from('setups')
    .select('setup_id')
    .like('setup_id', prefix + '__')

  if (setupidErr) throw setupidErr;

  return (prefix + (0xff - setupids.length - currentCount).toString(16)) as SetupID;
}

async function generateSetupEntry(row: InputSetup, prefixCount: Map<string, number>, oqb: boolean, mirror: SetupID | null, see: number, hold: number): Setup {
  // compute the build
  const gluedFumens = glueFumen(row.fumen, 1);

  let buildTmp = '';
  for (let mino of fumenGetMinos(gluedFumens[0])) {
    buildTmp += mino.type
  }
  const build = sortQueue(buildTmp as Queue);

  // compute the setupid
  let setup_id = await generateSetupID(row, prefixCount, oqb, build);

  return {
    setup_id,
    pc: row.pc,
    leftover: row.leftover,
    build,
    cover_pattern: row.cover_pattern,
    cover_description: row.cover_description,
    oqb_path: setup_id,
    fumen: row.fumen,
    solve_pattern: row.solve_pattern,
    mirror,
    see,
    hold,
    credit: row.credit
  }
}

async function generateStatEntry(setup: Setup, kicktable: Kicktable, holdtype: HoldType): Promise<Statistic> {
  const coverFilename = setup.setup_id + '.csv';
  const patternFilename = setup.setup_id + '.txt';
  const kickFilename = path.join(kicksPath, kicktable + '.properties');
  const drop = is180[kicktable] ? '180' : 'soft';
  const output = path.join(outputPath, coverFilename);
  const patternPath = path.join(outputPath, patternFilename);
  const cmdBase = (cmd: string) => `java -jar ${sfinderPath} ${cmd} -pp ${patternPath} -K ${kickFilename} -d ${drop}`;

  // run cover
  await fsPromises.writeFile(patternPath, extendPieces(setup.cover_pattern).join('\n'));

  const glueFumens = glueFumen(setup.fumen).join(' ');

  const coverCmd = cmdBase('cover') + ` -t ${glueFumens} -o ${output}`

  const { stderr: coverErr } = await execPromise(coverCmd);

  if (coverErr) throw coverErr
  
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
    coverData[coverData.length - 1] = bitToByte
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
    }
  }

  // run percent
  await fsPromises.writeFile(patternPath, extendPieces(setup.solve_pattern).join('\n'));

  const percentCmd = cmdBase('percent') + ` -t ${setup.fumen}`

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
  }
}

async function parseSetupInput(filepath: string, see: number = 7, hold: number = 1, kicktable: Kicktable = 'srs180', holdtype: HoldType = 'any') {
  const data = await fsPromises.readFile(filepath, { encoding: 'utf8' });
  const csvData = parse(data, {
    columns: true,
    cast: (value, { column }) => {
      if (column === 'id') {
        return parseInt(value);
      }
      if (column === 'pc') {
        return parseInt(value);
      }
      if (column === 'leftover') {
        return value as Queue;
      }
      if (column === 'fumen') {
        return value as Fumen;
      }
      if (column === 'children') {
        return value ? parseInt(value): null;
      }
      if (column === 'mirror') {
        return value ? parseInt(value): null;
      }
      return value ? value: null;
    }
  });

  const setups: Setup[] = [];
  const setupLinks: SetupOQBLink[] = [];
  const stats: Statistic[] = [];

  const idMap: (SetupID | null)[] = Array.from({ length: csvData.length}, () => null);
  const prefixCount: Map<string, number> = new Map();

  let childrenCountDown: number[] = [];
  const childrenStack: SetupID[] = [];
  const setupsAdded: Set<number> = new Set();
  for (let row of csvData) {
    const parent = row.children !== null && row.children > 0;
    const child = childrenCountDown.length > 0;
    const oqb = parent || child;
    const setup = await generateSetupEntry(row, prefixCount, oqb, null, see, hold);

    // compute the stats
    const stat = await generateStatEntry(setup, kicktable, holdtype);

    const duplicateSetupid = await checkDuplicate(setup, stat, setups, stats, kicktable, holdtype)
    if (duplicateSetupid === null) {
      idMap[row.id] = setup.setup_id;
      setups.push(setup);
      stats.push(stat);
      setupsAdded.add(row.id);
    } else {
      console.log(`Setup ${row.id} is a duplicate of ${duplicateSetupid}`)
      setup.setup_id = duplicateSetupid; // kept in case child isn't duplicate so link is made with existing setup
    }

    // child and not a duplicate setup
    if (child && duplicateSetupid === null) {
      const link = {
        child_id: setup.setup_id,
        parent_id: childrenStack[childrenStack.length - 1]
      }

      setupLinks.push(link);

      // decrement the count and remove if no more children
      if (--childrenCountDown[childrenCountDown.length - 1] == 0) {
        childrenCountDown.pop();
        childrenStack.pop();
      }
    }

    // add the count of children of this current setup
    if (parent) {
      childrenCountDown.push(row.children);
      childrenStack.push(setup.setup_id);
    }
  }

  for (let i of setupsAdded) {
    if (csvData[i].mirror !== null && idMap[csvData[i].mirror] !== null) {
      setups[i].mirror = idMap[csvData[i].mirror];
    }
  }

  console.log(setups, setupLinks, stats);
}

await parseSetupInput('utils/test.csv');
