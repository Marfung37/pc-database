import type { RequestHandler } from './$types';
import { PUBLIC_DEFAULT_KICKTABLE, PUBLIC_DEFAULT_HOLDTYPE } from '$env/static/public';
import { error, json } from '@sveltejs/kit';
import { isSetupID } from '$lib/utils/id';
import type { SetupID, Kicktable, HoldType } from '$lib/types';
import { getLocale } from '$lib/paraglide/runtime';
import { getSetup } from '$lib/utils/setupFinder';

export const GET: RequestHandler = async ({ url }) => {
  const setupid = url.searchParams.get('setupid') || null;
  const kicktable = url.searchParams.get('kicktable') || PUBLIC_DEFAULT_KICKTABLE;
  const holdtype = url.searchParams.get('holdtype') || PUBLIC_DEFAULT_HOLDTYPE;

  if (setupid === null) {
    throw error(400, 'Missing setupid');
  }

  if (!isSetupID(setupid)) {
    throw error(400, 'Invalid setupid');
  }

  // TODO: kicktable and holdtype validation
  const { data: setup, error: setupErr } = await getSetup(
    setupid as SetupID,
    false,
    true,
    getLocale(),
    kicktable as Kicktable,
    holdtype as HoldType
  );

  if (setupErr) {
    console.error('Failed to get setup:', setupErr.message);
    error(500, { message: 'Failed to get setup' });
  }

  return json(setup);
}
