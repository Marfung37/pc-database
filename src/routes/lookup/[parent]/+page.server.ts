import { fail, error } from '@sveltejs/kit';
import { isQueue } from '$lib/utils/queueUtils';
import { subStringSet, setupFinder, getSetup, isSetupID } from '$lib/utils/setupFinder';
import type { Actions, PageServerLoad } from './$types';
import type { Queue, SetupID } from '$lib/types';

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
  } else if (!subStringSet( subbuild.slice(0, setup.build.length + 1), setup.build)) {
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
