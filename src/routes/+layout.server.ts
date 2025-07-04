import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, cookies, locals: { getSafeSession } }) => {
  // If the request is for api, skip session fetching
  if (url.pathname.startsWith('/api')) {
    return {};
  }

  const { session, user } = await getSafeSession();

  return {
    session,
    user,
    cookies: cookies.getAll()
  };
};
