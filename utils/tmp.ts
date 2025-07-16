import { is2Line } from './lib/fumenUtils';
import { decompressPath, generateBucketPathFilename } from './lib/compression';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { decoder, encoder } from 'tetris-fumen';
import type { Queue, Fumen } from './lib/types';
import { WANTED_SAVE_DELIMITER } from './lib/saves/constants';
import { Fraction } from './lib/saves/fraction';
import { fumenGetComments, fumenCombineComments } from './lib/fumenUtils';
import { filter, type FilterOutput } from './lib/filter';

async function fixCode(row): Promise<boolean> {
  const stat = row.statistics;
  const save = row.saves.save;
  const setup = row.statistics.setups;

  console.log(stat.setup_id)

  const filename = generateBucketPathFilename(
    stat.setup_id,
    stat.kicktable,
    stat.hold_type
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
    data = await filter(save.split(WANTED_SAVE_DELIMITER), setup.build, setup.leftover, setup.pc, null, decompressedFile, is2Line(setup.fumen), false, false, true);
  } catch (e) {
    console.error(`Failed to generate data for ${row.save_data_id}:`, e);
    return false;
  }

  const patterns = data.patterns!;

  const pages = decoder.decode(row.minimal_solves);
  const fumenSet: string[] = [];
  for (let page of pages) {
    page.comment = '';
    fumenSet.push(encoder.encode([page]));
  }

  const solutionMap = new Map();
  for (const pattern of patterns) {
    for (const fumen of pattern.fumens) {
      let sol = solutionMap.get(fumen);
      if (!sol) {
        const pages = decoder.decode(fumen);

        for (let page of pages) {
          page.comment = ''
        }

        const strippedFumen = encoder.encode(pages);

        for (let i in fumenSet) {
          if (fumenSet[i] == strippedFumen) {
            fumenSet[i] = fumen;
            break;
          }
        }

        sol = {
          fumen,
          patterns: []
        };
        solutionMap.set(fumen, sol);
      }
      sol.patterns.push(pattern.pattern);
    }
  }

  const solutions = fumenSet.map(f => {
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

  const total = data.total!;
  let flag = false;

  for (let i = 0; i < solutions.length; i++) {
    let largestSize = 0;
    let largestIndex = -1;
    for (let j = 0; j < solutions.length; j++) {
      if (indiciesUsed.has(j)) continue;
      const size = setDifference(solutions[j].patterns, queueCoveredSet).size;
      if (size > largestSize) {
        largestSize = size;
        largestIndex = j;
      }
    }

    if (largestIndex == -1) {
      // all the additional fumens don't add any more coverage
      console.log(Array.from(setDifference(new Set(Array.from({ length: solutions.length }, (_, i) => i)), indiciesUsed)).map((i) => solutions[i].fumen))
      flag = true;
      break;
    }

    unionInPlace(queueCoveredSet, solutions[largestIndex].patterns);
    indiciesUsed.add(largestIndex);
    const fraction = new Fraction(queueCoveredSet.size, total);
    cumuFractions.push(fraction);
    fumenOrder.push(solutions[largestIndex].fumen);
  }

  const labels: string[] = [];

  for (let i in fumenOrder) {
    const fraction = cumuFractions[i];
    const fumen = fumenOrder[i];

    const percent = fraction.numerator / fraction.denominator * 100;
    const comment = fumenGetComments(fumen)[0];

    labels.push(`${comment}: ${percent.toFixed(2)}% (${fraction.numerator}/${fraction.denominator})`);
  }

  const newMinimal = fumenCombineComments(fumenOrder, labels);

  if (flag) {
    console.log(row.save_data_id, row.minimal_solves, newMinimal);
  } else {
    const {error: updateError} = await supabaseAdmin.from('save_data').update({minimal_solves: newMinimal}).eq('save_data_id', row.save_data_id);
    if (updateError) {
      console.error(`Failed to update ${row.save_data_id}:`, updateError);
      return false;
    }
  }

  return true;
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

async function runUploads(batchSize: number = 1000) {
  let from = 0;
  let done = false;

  while (!done) {
    const {data, error: dataError} = await supabaseAdmin
      .from('save_data')
      .select(`
        save_data_id,
        minimal_solves,
        statistics (
          setup_id,
          kicktable,
          hold_type,
          setups (
            build,
            leftover,
            pc,
            fumen
          )
        ),
        saves (
          save
        )
        `
      )
      .not('minimal_solves', 'is', null)
      .range(from, from + batchSize - 1);

    if (dataError) {
      console.error("Failed to get save data to calculate", dataError);
      return;
    }

    for (let row of data) {
      if (!await fixCode(row)) return;
      console.log(from)
      from++;
    }

    console.log("Completed", batchSize, "more");

    if (data && data.length > 0) {
      if (data.length < batchSize) {
        done = true; // last page
      }
    } else {
      done = true;
    }
  }
}

await runUploads();
