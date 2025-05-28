import { fail, error } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import { setupFinder, getSetup, isSetupID } from '$lib/utils/setupFinder';
import type { Actions, PageServerLoad } from './$types';
import type { Queue, SetupID } from '$lib/types';

/**
 * Checks if two strings are permutations of each other by sorting their characters.
 *
 * @param s1 The first string.
 * @param s2 The second string.
 * @returns true if the strings are permutations, false otherwise.
 */
function arePermutationsBySorting(s1: string, s2: string): boolean {
  // 1. Essential: If lengths are different, they cannot be permutations.
  if (s1.length !== s2.length) {
    return false;
  }

  // 2. Convert strings to character arrays, sort them, and join back into strings.
  const sortedS1 = s1.split('').sort().join('');
  const sortedS2 = s2.split('').sort().join('');

  // 3. Compare the sorted strings.
  return sortedS1 === sortedS2;
}

export const load: PageServerLoad = async ({ params }) => {
  const [parent_id, subbuild] = params.parent.split('+');

  if (parent_id === undefined || subbuild === undefined) {
    error(404, { message: 'No <setup-id>+<subbuild> found' });
  }

  if (!isSetupID(parent_id)) {
    error(404, { message: 'No setup id found' });
  }

  const { data: setup, error: setupErr } = await getSetup(parent_id as SetupID);

  if (setupErr) {
    console.error('Failed to get setup:', setupErr.message);
    error(500, { message: 'Failed to get setup' });
  }

  // looking up from a non oqb setup?
  if (setup.oqb_path === null) {
    error(404, { message: 'Setup is not an oqb setup' });
  } else if (!arePermutationsBySorting(setup.build, subbuild.slice(0, setup.build.length))) {
    error(404, { message: 'Incorrect pieces for the setup' });
  }

  return { setup };
};

export const actions: Actions = {
  lookup: async ({ params, request }) => {
    const formData = await request.formData();
    let queueStr = formData.get('queue') as string;
    const [parent_id, subbuild] = params.parent.split('+');

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
    console.log(setups);

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
  }
};
