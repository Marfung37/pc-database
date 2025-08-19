import { fail, error } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import { isSetupID } from '$lib/utils/id';
import { subStringSet, setupFinder, getSetup } from '$lib/utils/setupFinder';
import { percent } from '$lib/saves/percent';
import { Fraction } from '$lib/saves/fraction';
import { WANTED_SAVE_DELIMITER } from '$lib/saves/constants';
import { decompressPath, generateBucketPathFilename } from '$lib/utils/compression';
import { PATH_UPLOAD_BUCKET } from '$env/static/private';
import { PUBLIC_DEFAULT_KICKTABLE, PUBLIC_DEFAULT_HOLDTYPE } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';
import type { Queue, SetupID, Kicktable, HoldType } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
  let setupid: string,
    subbuild: string = '';
  let oqb: boolean = false;
  if (!params.setup.includes('+')) {
    setupid = params.setup;
  } else {
    oqb = true;
    [setupid, subbuild] = params.setup.split('+');
    if (setupid === undefined || subbuild === undefined) {
      error(404, { message: 'No <setup-id>+<subbuild> found' });
    }
  }

  if (!isSetupID(setupid)) {
    error(404, { message: 'No setup id found' });
  }

  const { data: setup, error: setupErr } = await getSetup(setupid as SetupID);

  if (setupErr) {
    console.error('Failed to get setup:', setupErr.message);
    error(500, { message: 'Failed to get setup' });
  }

  if (oqb) {
    // looking up from a non oqb setup?
    if (setup.type !== 'oqb') {
      error(404, { message: 'Setup is not an oqb setup' });
    } else if (!subStringSet(subbuild.slice(0, setup.build.length + 1), setup.build)) {
      error(404, { message: 'Incorrect pieces for the setup' });
    }
  }

  return { setup, subbuild };
};

export const actions: Actions = {
  lookup: async ({ params, request }) => {
    const formData = await request.formData();
    let queueStr = formData.get('queue') as string;
    const [parent_id, subbuild] = params.setup.split('+');

    if (parent_id === undefined || subbuild === undefined) {
      return fail(400, {
        success: false,
        queue: queueStr,
        message: 'Expected <parent_id>+<subbuild> for route'
      });
    }

    queueStr = subbuild + queueStr;
    if (!isQueue(queueStr)) {
      return fail(400, {
        success: false,
        queue: queueStr,
        message: `Invalid queue`
      });
    }

    const queue = queueStr as Queue;

    const { data: setups, error: setupsErr } = await setupFinder(queue, null, parent_id as SetupID);

    if (setupsErr) {
      console.error(
        `Failed to find setups for parent ${parent_id} and queue ${queue}:`,
        setupsErr.message
      );
      return fail(500, {
        success: false,
        queue: queueStr,
        message: `Failed to find setups`
      });
    }

    if (setups.length == 0) {
      return {
        success: false,
        queue: queueStr,
        message: 'No setups found'
      };
    }

    setups.sort((a, b) => {
      if (a.solve_percent === null) {
        return 1;
      } else if (b.solve_percent === null) {
        return -1;
      }

      return b.solve_percent - a.solve_percent;
    });

    return {
      success: true,
      setups
    };
  },
  saves_percent: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const wantedSaves = formData.get('wantedSaves') as string;
    const setupidStr = formData.get('setupid') as string;
    const buildStr = formData.get('build') as string;
    const leftoverStr = formData.get('leftover') as string;
    const pcStr = formData.get('pc') as string;

    const returnData = {
      wantedSaves,
      setupid: setupidStr,
      build: buildStr,
      leftover: leftoverStr,
      pc: pcStr
    };

    // checking if valid pc number
    if (!pcStr.match(/^[1-9]$/)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Invalid pc number`
      });
    }
    if (!isQueue(buildStr)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Invalid build`
      });
    }
    if (!isQueue(leftoverStr)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Invalid leftover`
      });
    }
    if (!isSetupID(setupidStr)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Invalid setupid`
      });
    }
    if (wantedSaves.length == 0) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Wanted Save not populated`
      });
    }

    const setupid = setupidStr as SetupID;
    const pc = parseInt(pcStr) as number;
    const build = buildStr as Queue;
    const leftover = leftoverStr as Queue;

    const filename = generateBucketPathFilename(
      setupid,
      PUBLIC_DEFAULT_KICKTABLE as Kicktable,
      PUBLIC_DEFAULT_HOLDTYPE as HoldType
    );

    const { data: fileExists, error: existError } = await supabase.storage
      .from(PATH_UPLOAD_BUCKET)
      .exists(filename);

    if (existError) {
      console.error(`Failed to check path file ${filename} existance:`, existError.message);
      return fail(500, {
        success: false,
        ...returnData,
        message: `Failed to check path file existance`
      });
    }

    if (!fileExists) {
      return fail(400, {
        success: false,
        ...returnData,
        message: `Path file for this setup does not exist`
      });
    }

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(PATH_UPLOAD_BUCKET)
      .download(filename);

    if (downloadError) {
      console.error(`Failed to download path file ${filename}:`, downloadError.message);
      return fail(500, {
        success: false,
        ...returnData,
        message: `Failed to download path file`
      });
    }

    const { data: decompressedFile, error: decompressError } = await decompressPath(
      Buffer.from(await fileData.arrayBuffer()),
      2
    );

    if (decompressError) {
      console.error(`Failed to decompress path file ${filename}:`, decompressError.message);
      return fail(500, {
        success: false,
        ...returnData,
        message: `Failed to decompress path file`
      });
    }

    let fractions: Fraction[];
    try {
      fractions = percent(
        wantedSaves.split(WANTED_SAVE_DELIMITER),
        build,
        leftover,
        pc,
        null,
        decompressedFile
      ); // TODO: twoline
    } catch (e) {
      if ((e as Error).message.match(/Expression '.*' could not be tokenized/)) {
        return fail(400, {
          success: false,
          ...returnData,
          message: `Percent failed: ${(e as Error).message}`
        });
      }
      console.error('Percent failed to run:', e);
      return fail(500, {
        success: false,
        ...returnData,
        message: `Percent failed to run: ${(e as Error).message}`
      });
    }

    return {
      success: true,
      wantedSaves,
      fractions: fractions.map((f: Fraction) => f.toString())
    };
  }
};
