import { generateMinimalSet } from './lib/filter';
import * as csv from 'csv-parse/sync';
import type { Queue, Fumen, SetupID, Kicktable, HoldType } from './lib/types';
import { decompressPath, generateBucketPathFilename } from './lib/compression';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { fumenGetNumPages } from './lib/fumenUtils';
import {
  COLUMN_QUEUE,
  COLUMN_FUMENS,
  COLUMN_FUMENS_DELIMITER
} from './lib/constants';

interface StatPathData {
  stat_id: string,
  setup_id: SetupID,
  kicktable: Kicktable,
  hold_type: HoldType
}

interface StatMinimalData {
  stat_id: string,
  minimal_solves: Fumen
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
  }).filter((row: any) => row[COLUMN_FUMENS].length > 0);

  const queues: Queue[] = [];
  const fumens: Set<Fumen> = new Set();
  const queueToFumens: Map<Queue, Fumen[]> = new Map();
  for (let row of parsed) {
    queues.push(row[COLUMN_QUEUE]);
    const newFumens = row[COLUMN_FUMENS].split(COLUMN_FUMENS_DELIMITER) as Fumen[];
    newFumens.forEach(item => fumens.add(item));
    queueToFumens.set(row[COLUMN_QUEUE], newFumens);
  }

  let minimalSolves: Fumen;
  try {
    minimalSolves = await generateMinimalSet(queues, fumens, queueToFumens, parsed.length);
  } catch (e) {
    console.error(`Failed to generate data for ${row.stat_id}:`, e);
    return false;
  }

  const count = fumenGetNumPages(minimalSolves);

  const { error: updateError } = await supabaseAdmin
    .from('statistics')
    .update({minimal_solves: minimalSolves, minimal_count: count})
    .eq('stat_id', row.stat_id);
  if (updateError) {
    console.error(`Failed to update ${row.stat_id}:`, updateError);
    return false;
  }

  return true;
}

async function getMinimalCounts(row: StatMinimalData): Promise<boolean> {
  console.log(`Processing stat_id: ${row.stat_id} for minimal count`);
  const count = fumenGetNumPages(row.minimal_solves);

  const { error: updateError } = await supabaseAdmin
    .from('statistics')
    .update({minimal_count: count})
    .eq('stat_id', row.stat_id);
  if (updateError) {
    console.error(`Failed to update ${row.stat_id}:`, updateError);
    return false;
  }

  return true;
}

async function runUploads(batchSize: number = 1000) {
  let from = 0;

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
      if (!(await generateMinimalData(row))) return;
    }
    from += batchSize;
  }

  // populate minimal counts
  while (true) {
    const { data, error: dataError } = await supabaseAdmin
      .from('statistics')
      .select('stat_id, minimal_solves')
      .is('minimal_count', null)
      .not('minimal_solves', 'is', null)
      .range(0, batchSize);
    if (dataError) {
      console.error('Failed to get stat data to calculate:', dataError.message);
      return;
    }
    if (data.length === 0) break;

    for (let row of data) {
      if (!(await getMinimalCounts(row))) return;
    }
  }
}

await runUploads();
