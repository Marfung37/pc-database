import fsPromises from 'fs/promises';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { extendPieces } from './lib/pieces';
import { fumenGetMinos } from './lib/fumenUtils';
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

async function generateSetupID(row: InputSetup, oqb: boolean, build: Queue): Promise<SetupID> {
  const prefix = generateSetupIDPrefix(row.pc, oqb, row.leftover, build, row.cover_pattern, row.fumen);

  const {data: setupids, error: setupidErr} = await supabaseAdmin
    .from('setups')
    .select('setup_id')
    .like('setup_id', prefix + '__')

  if (setupidErr) throw setupidErr;

  return (prefix + (0xff - setupids.length).toString(16)) as SetupID;
}

async function generateSetupEntry(row: InputSetup, oqb: boolean, mirror: SetupID | null, see: number, hold: number): Setup {
  // compute the build
  const gluedFumens = glueFumen(row.fumen, 1);

  let buildTmp = '';
  for (let mino of fumenGetMinos(gluedFumens[0])) {
    buildTmp += mino.type
  }
  const build = sortQueue(buildTmp as Queue);

  // compute the setupid
  let setup_id = await generateSetupID(row, oqb, build);

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
  const coverData = new Uint8Array((csvContent.length + 7) / 8);
  let bitToByte: number = 0;
  for (let i = 0; i < csvContent.length; i++) {
    bitToByte |= csvContent[i].slice(1).includes('O') << (7 - (i % 8));
    // once a full byte is completed
    if (i % 8 == 7) {
      coverData[(i - 7) / 8] = bitToByte;
      bitToByte = 0;
    }
  }
  // fill last space if a full byte isn't fully filled
  if (bitToByte > 0) {
    coverData[coverData.length - 1] = bitToByte
  }

  if (setup.solve_pattern === null) {
    return {
      setup_id: setup.setup_id,
      kicktable,
      hold_type: holdtype,
      cover_data: coverData,
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

  let childrenCountDown: number[] = [];
  const childrenStack: SetupID[] = [];
  for (let row of csvData) {
    const parent = row.children !== null && row.children > 0;
    const child = childrenCountDown.length > 0;
    const oqb = parent || child;
    const setup = await generateSetupEntry(row, oqb, null, see, hold);
    idMap[row.id] = setup.setup_id;

    if (child) {
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

    setups.push(setup);
  }

  for (let i = 0; i < csvData.length; i++) {
    if ('mirror' in csvData[i]) {
      setups[i].mirror = idMap[csvData[i].mirror];
    }

    const stat = await generateStatEntry(setups[i], kicktable, holdtype);
    stats.push(stat);
  }

  console.log(setups, setupLinks, stats);
}

await parseSetupInput('utils/test.csv');
