import { fail } from '@sveltejs/kit';
import { BAG } from '$lib/constants';
import { PCNUM2LONUM } from '$lib/utils/formulas';
import { setupFinder } from '$lib/utils/setupFinder';
import { formAction, pcSchema, queueSchema } from '$lib/server/forms';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages.js';
import { getLocale } from '$lib/paraglide/runtime';
import type { Actions, PageServerLoad } from './$types';
import type { Queue } from '$lib/types';

export const load: PageServerLoad = async () => {};

const lookupSchema = () =>
  z.object({
    pc: pcSchema(),
    queue: queueSchema(m.queue())
  });

export const actions: Actions = {
  lookup: formAction(lookupSchema(), async ({ data: { pc, queue } }) => {
    const returnData = {
      pc,
      queue
    };

    if (pc == 1 && queue.length == 6 && new Set(queue).size == 6) {
      const bagValue = [...BAG].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      const queueValue = [...queue].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      queue = (queue + String.fromCharCode(bagValue - queueValue)) as Queue;
    }

    if (pc !== 1 && queue.length < PCNUM2LONUM(pc)) {
      return fail(400, {
        success: false,
        ...returnData,
        error: m.database_error_leftover_uncertain()
      });
    }

    const { data: setups, error: setupsErr } = await setupFinder(
      queue,
      pc,
      null,
      true,
      true,
      getLocale()
    );

    if (setupsErr) {
      console.error(`Failed to find setups for pc ${pc} and queue ${queue}:`, setupsErr.message);
      return fail(500, {
        success: false,
        ...returnData,
        error: m.database_error_find_setup()
      });
    }

    if (setups.length == 0) {
      return {
        success: false,
        ...returnData,
        error: m.database_error_no_setup()
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
  })
};
