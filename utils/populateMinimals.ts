import fsPromises from 'fs/promises';
import { generateMinimalSet, type MinimalOutput } from './lib/filter';
import * as csv from 'csv-parse/sync';
import type { SetupID, Kicktable, HoldType } from './lib/types';
import { decompressPath, generateBucketPathFilename } from './lib/compression';
import { supabaseAdmin } from './lib/supabaseAdmin';
import {
  COLUMN_QUEUE,
  COLUMN_FUMENS,
  COLUMN_FUMENS_DELIMITER
} from './lib/constants';
import path from 'path';
import { fileURLToPath } from 'url';

const PLATFORM_HARD_TIMEOUT_MS = Infinity; // 6 * 60 * 60 * 1000; // 5 hours
const SAFETY_MARGIN_MS = 60 * 60 * 1000; // 1 hour
const EFFECTIVE_MAX_RUNTIME_MS = PLATFORM_HARD_TIMEOUT_MS - SAFETY_MARGIN_MS;

const currentFilePath = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const currentFileDir = path.dirname(currentFilePath);
const outputPath = path.join(currentFileDir, 'tmp');
const outputFile = path.join(outputPath, 'minimals.sql')

interface StatPathData {
  stat_id: string,
  setup_id: SetupID,
  kicktable: Kicktable,
  hold_type: HoldType,
}

if (process.env.PATH_UPLOAD_BUCKET === undefined) {
  console.error('PATH_UPLOAD_BUCKET expected');
  process.exit(1);
}

async function generateMinimalData(row: StatPathData): Promise<boolean> {
  console.log(`Processing stat_id: ${row.stat_id} and setup_id: ${row.setup_id}`);

  const filename = generateBucketPathFilename(row.setup_id, row.kicktable, row.hold_type);

  const { data: fileExists, error: existError } = await supabaseAdmin.storage
    .from(process.env.PATH_UPLOAD_BUCKET as string)
    .exists(filename);

  if (existError) {
    console.error(`Failed to check path file ${filename} existance:`, existError);
    return false;
  }

  if (!fileExists) {
    return false;
  }

  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from(process.env.PATH_UPLOAD_BUCKET as string)
    .download(filename);

  if (downloadError) {
    console.error(`Failed to download path file ${filename}:`, downloadError);
    return false;
  }

  const { data: decompressedFile, error: decompressError } = await decompressPath(
    Buffer.from(await fileData.arrayBuffer()),
    3
  );

  if (decompressError) {
    console.error(`Failed to decompress path file ${filename}:`, decompressError);
    return false;
  }

  const parsed = csv.parse(decompressedFile, {
    columns: true,
    skip_empty_lines: true
  })

  const patterns = parsed
    .filter((row: any) => row[COLUMN_FUMENS].length > 0)
    .map((row: any) => {return {pattern: row[COLUMN_QUEUE], fumens: row[COLUMN_FUMENS].split(COLUMN_FUMENS_DELIMITER)}});

  let data: MinimalOutput;
  try {
    data = await generateMinimalSet(patterns, parsed.length, path.join(outputPath, 'path.csv'), path.join(outputPath, 'path.txt'));
  } catch (e) {
    console.error(`Failed to generate data for ${row.stat_id}:`, e);
    return false;
  }

  await fsPromises.appendFile(outputFile, `UPDATE statistics SET minimal_solves = '${data.minimalSolves}', true_minimal = ${data.trueMinimal} WHERE stat_id = '${row.stat_id}';\n`)

  return true;
}

async function runUploads(batchSize: number = 1000) {
  const startTime = Date.now();
  let from = 0;

  await fsPromises.writeFile(outputFile, '');

  while (true) {
    const { data, error: dataError } = await supabaseAdmin
      .from('statistics')
      .select('stat_id, setup_id, hold_type, kicktable')
      .is('minimal_solves', null)
      .eq('path_file', true)
      .range(from, batchSize);
    if (dataError) {
      console.error('Failed to get stat data to calculate:', dataError.message);
      return;
    }
    if (data.length === 0) break;

    for (let row of data) {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= EFFECTIVE_MAX_RUNTIME_MS) {
        return;
      }

      if (!(await generateMinimalData(row))) return;
    }
    from += batchSize;
  }
}

await runUploads();
