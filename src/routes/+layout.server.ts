import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals: { getSafeSession }, cookies }) => {
  const { session, user } = await getSafeSession();

  return {
    session,
    user,
    cookies: cookies.getAll()
  };
};
