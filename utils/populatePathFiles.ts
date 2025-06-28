import fsPromises from "fs/promises";
import { compressPath } from './lib/compression';
import { isPC } from './lib/fumenUtils';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { extendPieces } from './lib/pieces';
import { generatePCPath } from './lib/generatePathFile';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Setup, Statistic, SetupID, Kicktable, HoldType } from './lib/types';
import path from 'path';
import { fileURLToPath } from 'url';

if (process.env.PATH_UPLOAD_BUCKET === undefined) {
  console.error("PATH_UPLOAD_BUCKET expected");
  process.exit(1);
}

const currentFilePath = fileURLToPath(import.meta.url);

// Get the directory name from the file path
const currentFileDir = path.dirname(currentFilePath);
const sfinderPath = path.join(currentFileDir, 'sfinder', 'sfinder.jar');
const kicksPath = path.join(currentFileDir, 'sfinder', 'kicks');
const outputPath = path.join(currentFileDir, 'tmp');
const execPromise = promisify(exec);

// Regular expression to capture the percentage and the fraction
const solveRegex = /^  -> success = (\d+\.\d+)% \((\d+)\/(\d+)\)/m;

const is180: Record<string, boolean> = {
  'srs': false,
  'srs_plus': true,
  'srsx': true,
  'srs180': true,
  'tetrax': true,
  'asc': false,
  'ars': false,
  'none': false
}

function generatePathFileName(setupid: SetupID, kicktable: Kicktable, holdtype: HoldType): string {
  return `${setupid}-${kicktable}-${holdtype}`;
}

async function uploadPath(setup: Setup, stat: Statistic): Promise<boolean> {
  const filenameBase = generatePathFileName(setup.setup_id, stat.kicktable, stat.hold_type);
  const pathFilename = filenameBase + '.csv';
  const supabaseFilename = filenameBase + '.csvd.xz';
  const patternFilename = filenameBase + '.txt';
  const kicktable = path.join(kicksPath, stat.kicktable + '.properties');
  const drop = is180[stat.kicktable] ? '180': 'soft';
  const output = path.join(outputPath, pathFilename);
  const patternPath = path.join(outputPath, patternFilename)
  const cmd = `java -jar ${sfinderPath} path -t ${setup.fumen} -pp ${patternPath} -f csv -k pattern -K ${kicktable} -d ${drop} -o ${output}`;
  console.log("Creating path file", pathFilename);

  try {
    const queues = extendPieces(setup.solve_pattern);

    if (isPC(setup.fumen)) {
      const { error: genPathErr } = await generatePCPath(setup.fumen, queues, output);
      if (genPathErr) {
        throw genPathErr;
      }
    } else {
      await fsPromises.writeFile(patternPath, queues.join('\n'));

      const { stdout, stderr: sfinderErr } = await execPromise(cmd);
      if (sfinderErr) {
        console.error(`An error occurred running sfinder to generate ${pathFilename}`, sfinderErr);
        return false;
      }
      await fsPromises.unlink(patternPath);

      const match = stdout.match(solveRegex);
      if (match === null) {
        console.error(`Fail to get the solve percent of the setup`);
        return false;
      }

      const percent = parseFloat(match[1]); // Convert the captured string to a number
      const numerator = parseInt(match[2], 10); // Convert to integer
      const denominator = parseInt(match[3], 10); // Convert to integer

      if (Math.abs(percent - stat.solve_percent) > 0e-4) {
        console.error(`Percentage different for ${setup.setup_id} ${stat.stat_id}: percent computed ${percent}, database ${stat.solve_percent}`);
        console.error(cmd);
        return false;
      } 
      if (numerator != stat.solve_fraction.numerator || denominator != stat.solve_fraction.denominator) {
        console.error(`Percentage different for ${setup.setup_id} ${stat.stat_id}: fraction computed ${numerator}/${denominator}, database ${stat.solve_fraction.numerator}/${stat.solve_fraction.denominator}`);
        console.error(cmd);
        return false;
      }
    }

    const { data, error: compressErr } = await compressPath(output, setup.solve_pattern);
    if (compressErr) {
      throw compressErr;
    }

    const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
      .from(process.env.PATH_UPLOAD_BUCKET as string)
      .upload(supabaseFilename, data, {
        contentType: 'application/x-xz',
        upsert: true, // Set to true to overwrite if a file with the same path exists
      });
    
    if (uploadErr) {
      console.error('Error uploading file to supabase:', uploadErr.message);
      return false;
    }

    console.log("Uploaded", uploadData.path);

    const { error: updateErr } = await supabaseAdmin
      .from('statistics')
      .update({path_file: true})
      .eq('stat_id', stat.stat_id);
    
    if (updateErr) {
      console.error('Error updating path file in supabase:', updateErr.message);
      return false;
    }
    
    await fsPromises.unlink(output);

    return true;
    
  } catch (error) {
    console.error(`An error occurred when generating ${supabaseFilename}:`, error.message);
  }

  return false;
}

async function runUploads(batchSize: number = 1000) {
  let working = true;
  
  while (working) {
    working = false;

    const { data: setupStats, error: setupErr } = await supabaseAdmin
      .from('setups')
      .select(`*, statistics!inner (stat_id, kicktable, hold_type, solve_percent, solve_fraction)`)
      .filter('statistics.path_file', 'eq', false) 
      .not('solve_pattern', 'is', null)
      .limit(batchSize);

    if (setupErr) {
      console.error("Failed to get setups:", setupErr.message);
      return;
    }

    for(let setupStat of setupStats) {
      const {statistics: stats, ...setup} = setupStat;
      for(let stat of stats) {
        working = await uploadPath(setup, stat) || working;
      }
    }
  }
}

await runUploads();
