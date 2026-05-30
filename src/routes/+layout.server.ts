import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ cookies, locals: { getSafeSession } }) => {
  const { session, user } = await getSafeSession();

  return {
    session,
    user,
    cookies: cookies.getAll()
  };
};
