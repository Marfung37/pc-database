import type {
  Result,
  Setup,
  Statistic,
  SetupVariant,
  Kicktable,
  Queue,
  SetupID,
  HoldType
} from '$lib/types';
import { PCNUM2LONUM } from '$lib/utils/formulas';
import { sortQueue } from '$lib/utils/queueUtils';
import { piecesContains } from '$lib/utils/piecesContains';
import { supabase } from '$lib/supabaseClient';

type setupFullData = Setup & Statistic & { variants: SetupVariant[] };

// Helper function remains necessary for counting characters
function getCharCounts(str: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const char of str) {
    counts.set(char, (counts.get(char) || 0) + 1);
  }
  return counts;
}

function subStringSet(str: string, substr: string): boolean {
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
  pcNum: number,
  queue: Queue,
  previousSetup: SetupID | null = null,
  kicktable: Kicktable = 'srs180',
  hold_type: HoldType = 'any'
): Result<setupFullData[]> {
  let setups, setupErr;
  if (previousSetup) {
    const { data: tmp, error: tmpErr } = await supabase.rpc('find_setup_leftover', {
      parent_id: previousSetup,
      kicktable,
      hold_type
    });
    setups = tmp;
    setupErr = tmpErr;
  } else {
    const leftover = sortQueue(queue.slice(0, PCNUM2LONUM(pcNum)) as Queue);
    const { data: tmp, error: tmpErr } = await supabase.rpc('find_setup_leftover', {
      leftover,
      kicktable,
      hold_type
    });
    setups = tmp;
    setupErr = tmpErr;
  }

  if (setupErr) return { data: null, error: setupErr };

  const validSetups = [];
  for (let setup of setups) {
    // check with build if the build is within the queue first len(build) + 1 pieces
    if (!subStringSet(queue.slice(0, setup.build.length + 1), setup.build)) continue;

    const index = piecesContains(queue, setup.cover_pattern, (x, y) => y.startsWith(x));

    if (index == -1) continue;

    if (setup.cover_data == null) validSetups.push(setup);
    else {
      // index the cover data bit mask
      const hexdigit = setup.cover_data.slice(2)[Math.floor(index / 4)];
      const covered = parseInt(hexdigit, 16) & (0b1000 >> index % 4);
      if (covered) validSetups.push(setup);
    }
  }

  return { data: validSetups, error: null };
}
