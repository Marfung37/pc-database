import { redirect } from '@sveltejs/kit';
import { fail } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import type { Queue } from '$lib/types';
import { DEFAULT_KICKTABLE, DEFAULT_HOLD_TYPE } from '$lib/constants';

interface FilterOptions {
  pc?: number;
  leftover?: Queue;
}

const PAGE_SIZE = 100;

export async function load({ url, locals: { supabase }, depends }) {
  depends('setups');

  const params = url.searchParams;
  const filters = validateParams(params);

  if (filters === null) redirect(307, `${url.pathname}?${params.toString()}`);

  let query = supabase
    .from('setups')
    .select('setup_id, pc, leftover, build, fumen, statistics!inner(solve_percent)')
    .eq('statistics.hold_type', DEFAULT_HOLD_TYPE)
    .eq('statistics.kicktable', DEFAULT_KICKTABLE);

  // query to list of leftovers
  let leftoverQuery = supabase.from('pc_leftovers').select('leftover');

  if (filters.pc) {
    query = query.eq('pc', filters.pc);
    leftoverQuery = leftoverQuery.eq('pc', filters.pc);
  }
  if (filters.leftover) {
    query = query.eq('leftover', filters.leftover);
  }
  query = query.order('setup_id').limit(PAGE_SIZE);
  leftoverQuery = leftoverQuery.order('sort_key');

  const { data, error } = await query;

  if (error) {
    console.error(`Failed to get setup data: ${error.message}`);
    return fail(500, {
      message: `Failed to get setup data`
    });
  }

  // flatten statistics table
  const cleanData = data.map((row) => {
    return {
      setup_id: row.setup_id,
      pc: row.pc,
      leftover: row.leftover,
      build: row.build,
      fumen: row.fumen,
      solve_percent: row.statistics[0].solve_percent
    };
  });

  let leftovers: string[] = [];
  if (filters.pc) {
    const { data: leftoverData, error: leftoverErr } = await leftoverQuery;

    if (leftoverErr) {
      console.error(`Failed to get list of leftovers: ${leftoverErr.message}`);
      return fail(500, {
        message: `Failed to get leftover data`
      });
    }

    leftovers = leftoverData.map((row) => row.leftover);
  }

  return { setups: cleanData, leftovers };
}

function validateParams(params: URLSearchParams): FilterOptions | null {
  const rawPC = params.get('pc');
  const rawLeftover = params.get('leftover');

  const options: FilterOptions = {};
  if (rawPC !== null) {
    const parsedPC = Number(rawPC);

    if (!Number.isInteger(parsedPC) || parsedPC < 1 || parsedPC > 9) {
      params.delete('pc');
    } else {
      options.pc = parsedPC;
    }
  }

  if (rawLeftover !== null) {
    if (!isQueue(rawLeftover)) {
      params.delete('leftover');
    } else {
      options.leftover = rawLeftover as Queue;
    }
  }

  return options;
}
