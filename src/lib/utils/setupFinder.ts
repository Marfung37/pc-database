import type { Result, Kicktable, Queue, SetupID, HoldType, SetupData } from '$lib/types';
import { PCNUM2LONUM } from '$lib/utils/formulas';
import { sortQueue } from '$lib/utils/queueUtils';
import { piecesContains } from '$lib/utils/piecesUtils';
import { supabase } from '$lib/supabaseClient';
import { PUBLIC_DEFAULT_KICKTABLE, PUBLIC_DEFAULT_HOLDTYPE } from '$env/static/public';

// Helper function remains necessary for counting characters
function getCharCounts(str: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of str) {
    counts.set(char, (counts.get(char) || 0) + 1);
  }
  return counts;
}

export function subStringSet(str: string, substr: string): boolean {
  const strCounts = getCharCounts(str);
  const substrCounts = getCharCounts(substr);
  for (const [char, count] of substrCounts.entries()) {
    if ((strCounts.get(char) || 0) < count) {
      return false;
    }
  }
  return true;
}

/**
 * Basic setup finder that gives a list of setups
 *
 * @param pcNum - An integer 1-9 representing the pc number
 * @param queue - A string representing a queue consisting of only TILJSZO
 * @param previousSetup - the id of the previous setup used
 * @param kicktable
 * @param hold_type
 * @returns array of setups
 */
export async function setupFinder(
  queue: Queue,
  pcNum: number | null = null,
  previousSetup: SetupID | null = null,
  include_variants: boolean = false,
  include_saves: boolean = false,
  language: string = 'en',
  kicktable: Kicktable = PUBLIC_DEFAULT_KICKTABLE as Kicktable,
  hold_type: HoldType = PUBLIC_DEFAULT_HOLDTYPE as HoldType
): Result<SetupData[]> {
  let bareSetups, bareErr;
  // DEBUG
  let requestTime = 0;
  if (previousSetup) {
    const { data: tmp, error: tmpErr } = await supabase.rpc('find_bare_setup_parent_id', {
      parent_id: previousSetup,
      kicktable,
      hold_type
    });

    bareSetups = tmp;
    bareErr = tmpErr;
  } else if (pcNum) {
    const leftover = sortQueue(queue.slice(0, PCNUM2LONUM(pcNum)) as Queue);
    if (leftover.length < PCNUM2LONUM(pcNum)) {
      return { data: [], error: null };
    }

    // DEBUG
    const start = performance.now();
    const { data: tmp, error: tmpErr } = await supabase.rpc('find_bare_setup_leftover', {
      p_leftover: leftover,
      kicktable,
      hold_type
    });

    bareSetups = tmp;
    bareErr = tmpErr;

    // DEBUG
    requestTime += performance.now() - start;
  } else {
    return {
      data: null,
      error: new Error('setupFinder expects either pcNum or previousSetup to be set')
    };
  }

  if (bareErr) return { data: null, error: bareErr };
  if (bareSetups.length == 0) return { data: [], error: null };

  const validSetups = [];
  // DEBUG
  let start = performance.now();
  for (let setup of bareSetups) {
    // check with build if the build is within the queue first len(build) + 1 pieces
    if (!subStringSet(queue.slice(0, setup.build.length + 1), setup.build)) continue;

    // if (setup.see >= leftoverSize && queue.length < leftoverSize) {
    //   // if see can see the whole leftover, expects whole leftover given
    //   continue;
    // }

    const index = piecesContains(queue, setup.cover_pattern, (x, y) => {
      return x.startsWith(y);
    });

    if (index == -1) continue;

    if (setup.cover_data == null) validSetups.push(setup);
    else {
      // index the cover data bit mask
      const hexdigit = setup.cover_data.slice(2)[Math.floor(index / 4)];
      const covered = parseInt(hexdigit, 16) & (0b1000 >> index % 4);
      if (covered) validSetups.push(setup);
    }
  }
  // DEBUG
  console.log('Timing validity test:', performance.now() - start, 'ms');

  // DEBUG
  start = performance.now();

  const { data: setups, error: setupErr } = await supabase.rpc('find_setup_setup_id', {
    p_setup_ids: validSetups.map((setup) => setup.setup_id),
    p_include_variants: include_variants,
    p_include_saves: include_saves,
    kicktable,
    hold_type,
    language
  });

  // DEBUG
  requestTime += performance.now() - start;
  console.log('Timing sql request:', requestTime, 'ms');

  if (setupErr) return { data: null, error: setupErr };
  return { data: setups, error: null };
}

export async function getSetup(
  setupId: SetupID,
  include_variants: boolean = false,
  include_saves: boolean = false,
  language: string = 'en',
  kicktable: Kicktable = PUBLIC_DEFAULT_KICKTABLE as Kicktable,
  hold_type: HoldType = PUBLIC_DEFAULT_HOLDTYPE as HoldType
): Result<SetupData> {
  const { data: setup, error: setupErr } = await supabase.rpc('find_setup_setup_id', {
    p_setup_ids: [setupId],
    p_include_variants: include_variants,
    p_include_saves: include_saves,
    kicktable,
    hold_type,
    language
  });

  if (setupErr) return { data: null, error: setupErr };

  return { data: setup[0], error: null };
}
