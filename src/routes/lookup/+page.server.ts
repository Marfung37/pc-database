import { fail } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import { BAG } from '$lib/constants';
import { PCNUM2LONUM } from '$lib/utils/formulas';
import { setupFinder } from '$lib/utils/setupFinder';
import type { Actions, PageServerLoad } from './$types';
import type { Queue } from '$lib/types';
import { getLocale } from '$lib/paraglide/runtime';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async () => {};

export const actions: Actions = {
  lookup: async ({ request }) => {
    const formData = await request.formData();
    const pcStr = formData.get('pc') as string;
    const queueStr = formData.get('queue') as string;

    const returnData = {
      pc: pcStr,
      queue: queueStr
    };

    // checking if valid pc number
    if (!pcStr.match(/^[1-9]$/)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: m.lookup_error_invalid_pc()
      });
    }
    if (queueStr.length === 0) {
      return fail(400, {
        success: false,
        ...returnData,
        message: m.lookup_error_empty_queue()
      });
    }

    if (!isQueue(queueStr)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: m.lookup_error_invalid_queue()
      });
    }

    const pc = parseInt(pcStr) as number;

    let queue: Queue;
    if (pc == 1 && queueStr.length == 6 && new Set(queueStr).size == 6) {
      const bagValue = [...BAG].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      const queueValue = [...queueStr].reduce((sum, c) => sum + c.charCodeAt(0), 0);
      queue = (queueStr + String.fromCharCode(bagValue - queueValue)) as Queue;
    } else {
      queue = queueStr as Queue;
    }

    if (pc !== 1 && queue.length < PCNUM2LONUM(pc)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: m.lookup_error_leftover_uncertain()
      });
    }

    const { data: setups, error: setupsErr } = await setupFinder(queue, pc, null, true, true, getLocale());

    if (setupsErr) {
      console.error(`Failed to find setups for pc ${pc} and queue ${queue}:`, setupsErr.message);
      return fail(500, {
        success: false,
        ...returnData,
        message: m.lookup_error_find_setup()
      });
    }

    if (setups.length == 0) {
      return {
        success: false,
        ...returnData,
        message: m.lookup_error_no_setup()
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
};
