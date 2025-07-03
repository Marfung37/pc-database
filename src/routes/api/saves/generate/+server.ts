import type { RequestHandler } from './$types';
import { filter } from '$lib/saves/filter';
import { error, json } from '@sveltejs/kit';
import { is2Line } from '$lib/utils/fumenUtils';
import { Fraction } from '$lib/saves/fraction';
import type { SetupID, SaveData } from '$lib/types';
import { decompressPath, generateBucketPathFilename } from '$lib/utils/compression';
import { WANTED_SAVE_DELIMITER } from '$lib/saves/constants';
import { PATH_UPLOAD_BUCKET } from '$env/static/private';

export const GET: RequestHandler = async ({ locals: { supabase }}) => {
  const {data, error: dataError} = await supabase.rpc('find_uncalculated_saves');
  if (dataError) {
    console.error("Failed to get save data to calculate for");
    throw error(500, {message: "Failed to get save data to calculate for"});
  }

  for (let row of data) {
    // create save_data entry with processing
    const skeletonRow = {stat_id: row.stat_id, save_id: row.save_id, save_percent: 0, save_fraction: {numerator: 1, denominator: 1}, status: 'processing'};
    const { data: saveDataID, error: insertError } = await supabase
      .from('save_data')
      .insert(skeletonRow)
      .select('save_data_id')
      .single();

    if (insertError) {
      if (insertError.code == '23505') {
        // skips processing this row if already exist
        continue;
      } else {
        // insert error
        console.error('Failed to insert skeleton row:', insertError.message);
        throw error(500, {message: 'Failed to insert skeleton row'})

      }
    }

    const filename = generateBucketPathFilename(
      row.setup_id,
      row.kicktable,
      row.hold_type
    );

    const { data: fileExists, error: existError } = await supabase.storage
      .from(PATH_UPLOAD_BUCKET)
      .exists(filename);

    if (existError) {
      console.error(`Failed to check path file ${filename} existance:`, existError.message);
      throw error(500, {
        message: `Failed to check path file existance`
      });
    }

    if (!fileExists) {
      throw error(500, {
        message: `Path file for this setup does not exist`
      });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(PATH_UPLOAD_BUCKET)
      .download(filename);

    if (downloadError) {
      console.error(`Failed to download path file ${filename}:`, downloadError.message);
      throw error(500, {
        message: `Failed to download path file`
      });
    }

    const { data: decompressedFile, error: decompressError } = await decompressPath(
      Buffer.from(await fileData.arrayBuffer()),
      3
    );

    if (decompressError) {
      console.error(`Failed to decompress path file ${filename}:`, decompressError.message);
      throw error(500, {
        message: `Failed to decompress path file`
      });
    }

    let data;
    try {
      data = filter(row.save.split(WANTED_SAVE_DELIMITER), row.build, row.leftover, row.pc, null, decompressedFile, is2Line(row.fumen), row.gen_all_saves, row.gen_minimal);
    } catch (e) {
      console.error(`Failed to generate data for ${saveDataID.save_data_id}:`, e);
      throw error(500, {
        message: `Failed to generate data for ${saveDataID.save_data_id}`
      });
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
      all_solves: (row.gen_all_saves) ? data.uniqueSolves!: null,
      minimal_solves: (row.gen_minimal) ? data.minimalSolves!: null
    }
    if (percents.length == 1) {
      newRow.save_percent = percents[0];
      newRow.save_fraction = data.fractions[0];
    } else {
      newRow.priority_save_percent = percents;
      newRow.priority_save_fraction = data.fractions;
    }

    const {error: updateError} = await supabase.from('save_data').update(newRow).eq('save_data_id', saveDataID.save_data_id);
    if (updateError) {
      console.error(`Failed to update ${saveDataID.save_data_id}:`, updateError.message);
      throw error(500, {
        message: `Failed to update ${saveDataID.save_data_id}`
      });
    }
  }

  return json({ status: 'success' });
}
