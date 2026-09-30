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
import { formAction, setupIDSchema, pcSchema, queueSchema } from '$lib/server/forms';
import { z } from 'zod';
import { getLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages.js';
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
  }

  if (!isSetupID(setupid)) {
    error(404, { message: m.database_error_invalid_setup_id() });
  }

  const { data: setup, error: setupErr } = await getSetup(
    setupid as SetupID,
    false,
    true,
    getLocale()
  );

  if (setupErr) {
    console.error('Failed to get setup:', setupErr.message);
    error(500, { message: m.database_error_find_setup() });
  }

  if (oqb) {
    // looking up from a non oqb setup?
    if (setup.type !== 'oqb') {
      error(404, { message: m.database_error_non_oqb_with_queue() });
    } else if (!subStringSet(subbuild.slice(0, setup.build.length + 1), setup.build)) {
      error(404, { message: m.database_error_oqb_with_invalid_queue() });
    }
  }

  return { setup, subbuild };
};

const lookupSchema = () =>
  z.object({
    queue: queueSchema(m.queue())
  });

const savesSchema = () =>
  z.object({
    pc: pcSchema(),
    leftover: queueSchema(m.leftover()),
    build: queueSchema(m.build()),
    setupid: setupIDSchema(m.setupid()),
    wantedSaves: z.string()
  });

export const actions: Actions = {
  lookup: formAction(
    lookupSchema(),
    { errorKey: 'lookupErrors' },
    async ({ data: { queue }, params }) => {
      const [parent_id, subbuild] = params.setup!.split('+');

      if (parent_id === undefined || subbuild === undefined) {
        return fail(400, {
          success: false,
          queue,
          lookupError: m.database_error_oqb_next_setup_no_queue()
        });
      }

      if (!isQueue(subbuild)) {
        return fail(400, {
          success: false,
          queue,
          lookupError: m.database_error_invalid_queue()
        });
      }

      queue = (subbuild + queue) as Queue;

      const { data: setups, error: setupsErr } = await setupFinder(
        queue,
        null,
        parent_id as SetupID,
        true,
        true,
        getLocale()
      );

      if (setupsErr) {
        console.error(
          `Failed to find setups for parent ${parent_id} and queue ${queue}:`,
          setupsErr
        );
        return fail(500, {
          success: false,
          queue,
          lookupError: m.database_error_find_setup()
        });
      }

      if (setups.length == 0) {
        return {
          success: false,
          queue,
          lookupError: m.database_error_no_setup()
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
    }
  ),
  savesPercent: formAction(
    savesSchema(),
    { errorKey: 'savesErrors' },
    async ({ data: { pc, leftover, build, setupid, wantedSaves }, locals: { supabase } }) => {
      const returnData = {
        wantedSaves,
        setupid,
        build,
        leftover,
        pc
      };

      if (wantedSaves.length == 0) {
        return fail(400, {
          success: false,
          ...returnData,
          savesError: m.database_error_empty_wanted_saves()
        });
      }

      const filename = generateBucketPathFilename(
        setupid,
        PUBLIC_DEFAULT_KICKTABLE as Kicktable,
        PUBLIC_DEFAULT_HOLDTYPE as HoldType
      );

      const { data: fileExists, error: existError } = await supabase.storage
        .from(PATH_UPLOAD_BUCKET)
        .exists(filename);

      if (existError) {
        console.error(`Failed to check path file ${filename} existence:`, existError.message);
        return fail(500, {
          success: false,
          ...returnData,
          savesError: m.database_error_find_path_file()
        });
      }

      if (!fileExists) {
        return fail(400, {
          success: false,
          ...returnData,
          savesError: m.database_error_no_path_file()
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
          savesError: m.database_download_path_file()
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
          savesError: m.database_error_decompress_path_file()
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
        );
      } catch (e) {
        if ((e as Error).message.match(/Expression '.*' could not be tokenized/)) {
          return fail(400, {
            success: false,
            ...returnData,
            savesError: `${m.database_error_run_saves_percent()}${(e as Error).message}`
          });
        }
        console.error('Percent failed to run:', e);
        return fail(500, {
          success: false,
          ...returnData,
          savesError: `${m.database_error_run_saves_percent()}${(e as Error).message}`
        });
      }

      return {
        success: true,
        wantedSaves,
        fractions: fractions.map((f: Fraction) => f.toString())
      };
    }
  )
};
