import { fail } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import { setupFinder } from '$lib/utils/setupFinder';
import type { Actions, PageServerLoad } from './$types';
import type { Queue } from '$lib/types';

export const load: PageServerLoad = async () => {

}

export const actions: Actions = {
  lookup: async ({ request }) => {
    const formData = await request.formData();
    const pcStr = formData.get('pc') as string;
    const queueStr = formData.get('queue') as string;

    // checking if valid pc number
    if (!pcStr.match(/^[1-9]$/)) {
      return fail(400, {
        success: false,
        pcStr,
        queueStr,
        message: `Invalid pc number`
      });
    }
    if (!isQueue(queueStr)) {
      return fail(400, {
        success: false,
        pcStr,
        queueStr,
        message: `Invalid queue`
      });
    }

    const pc = parseInt(pcStr) as number;
    const queue = queueStr as Queue;

    const {data: setups, error: setupsErr} = await setupFinder(pc, queue);

    if (setupsErr) {
      console.error(`Failed to find setups for pc ${pc} and queue ${queue}:`, setupsErr.message)
      return fail(500, {
        success: false,
        pcStr,
        queueStr,
        message: `Failed to find setups`
      });
    }

    if (setups.length == 0) {
      return {
        success: false,
        pcStr,
        queueStr,
        message: 'No setups found'
      }
    }

    return {
      success: true,
      setups
    }
  }
};
