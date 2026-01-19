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
  getSetups: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();

    const pcStr = formData.get('pc') as string;

    const returnData = {
      pc: pcStr
    };

    // checking if valid pc number
    if (!pcStr.match(/^[1-9]$/)) {
      return fail(400, {
        success: false,
        ...returnData,
        message: m.lookup_error_invalid_pc()
      });
    }

    const pc = parseInt(pcStr) as number;

    const {data: setups, error: setupsErr } = await supabase
      .from('setups')
      .select('setup_id')
      .eq('pc', pc)
    if (setupsErr) {
      console.error(`Failed to find setups for pc ${pc}`, setupsErr.message);
      return fail(500, {
        success: false,
        ...returnData,
        message: 'Unable to find setups for pc'
      })
    }

    return {
      success: true,
      setup_ids: setups.map((s) => s.setup_id)
    }
  }
};
