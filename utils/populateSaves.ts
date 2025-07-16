import { is2Line } from './lib/fumenUtils';
import { filter, type FilterOutput } from './lib/filter';
import { Fraction } from './lib/saves/fraction';
import { WANTED_SAVE_DELIMITER } from './lib/saves/constants';
import type { SetupID, SaveData } from './lib/types';
import { decompressPath, generateBucketPathFilename } from './lib/compression';
import { supabaseAdmin } from './lib/supabaseAdmin';

const PLATFORM_HARD_TIMEOUT_MS = 6 * 60 * 60 * 1000; // 5 hours
const SAFETY_MARGIN_MS = 60 * 60 * 1000; // 1 hour
const EFFECTIVE_MAX_RUNTIME_MS = PLATFORM_HARD_TIMEOUT_MS - SAFETY_MARGIN_MS;

if (process.env.PATH_UPLOAD_BUCKET === undefined) {
  console.error('PATH_UPLOAD_BUCKET expected');
  process.exit(1);
}

async function generateSaveData(row): Promise<boolean> {
  // create save_data entry with processing
  const skeletonRow = {stat_id: row.stat_id, save_id: row.save_id, save_percent: 0, save_fraction: {numerator: 1, denominator: 1}, status: 'processing'};

  console.log(`Processing stat_id: ${row.stat_id} and save_id: ${row.save_id}`);

  const { data: saveDataID, error: insertError } = await supabaseAdmin
    .from('save_data')
    .insert(skeletonRow)
    .select('save_data_id')
    .single();

  if (insertError) {
    if (insertError.code == '23505') {
      // skips processing this row if already exist
      return false;
    } else {
      // insert error
      console.error('Failed to insert skeleton row:', insertError);
      return false;
    }
  }

  const filename = generateBucketPathFilename(
    row.setup_id,
    row.kicktable,
    row.hold_type
  );

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

  let data: FilterOutput;
  try {
    data = await filter(row.save.split(WANTED_SAVE_DELIMITER), row.build, row.leftover, row.pc, null, decompressedFile, is2Line(row.fumen), row.gen_all_saves, row.gen_minimal, saveDataID.save_data_id);
  } catch (e) {
    console.error(`Failed to generate data for ${saveDataID.save_data_id}:`, e);
    return false;
  }

  const percents = data.fractions.map((f: Fraction) => (f.numerator / f.denominator * 100));
  const newRow: SaveData = {
    ...skeletonRow,
    save_data_id: (saveDataID.save_data_id as SetupID),
    status: 'completed',
    save_percent: null,
    save_fraction: null,
    priority_save_percent: null,
    priority_save_fraction: null,
    all_solves: data.uniqueSolves ?? null,
    minimal_solves: data.minimalSolves ?? null,
    true_minimal: data.trueMinimal ?? null
  }
  if (percents.length == 1) {
    newRow.save_percent = percents[0];
    newRow.save_fraction = data.fractions[0];
  } else {
    newRow.priority_save_percent = percents;
    newRow.priority_save_fraction = data.fractions;
  }

  const {error: updateError} = await supabaseAdmin.from('save_data').update(newRow).eq('save_data_id', saveDataID.save_data_id);
  if (updateError) {
    console.error(`Failed to update ${saveDataID.save_data_id}:`, updateError);
    return false;
  }
  
  return true;
}

async function runUploads(batchSize: number = 1000) {
  const startTime = Date.now();

  while (true) {
    const {data, error: dataError} = await supabaseAdmin.rpc('find_uncalculated_saves', {
      max_rows: batchSize
    });
    if (dataError) {
      console.error("Failed to get save data to calculate");
      return;
    }

    for (let row of data) {
      const elapsedTime = Date.now() - startTime;

      if (elapsedTime >= EFFECTIVE_MAX_RUNTIME_MS) {
        return;
      }

      if (!await generateSaveData(row)) return;
    }
  }
}

await runUploads();
