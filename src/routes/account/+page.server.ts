import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { safeGetSession } }) => {
  const { session, user } = await safeGetSession();

  if (!session) {
    redirect(303, '/');
  }

  const profile = { username: user.app_metadata.user_info.username };

  return { session, profile };
};

export const actions: Actions = {
  update: async ({ request, locals: { supabase, safeGetSession } }) => {
    const formData = await request.formData();
    const username = formData.get('username') as string;

    const { session, user } = await safeGetSession();

    console.log(session, user);

    console.log(user.app_metadata.user_info.user_id);

    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('user_id', user.app_metadata.user_info.user_id)
      .select();

    console.log(data);

    if (error) {
      console.error('Failed to update user:', error.message);
      return fail(500, {
        username
      });
    }

    return {
      sucess: true,
      username
    };
  },
  signout: async ({ locals: { supabase, safeGetSession } }) => {
    const { session } = await safeGetSession();
    if (session) {
      await supabase.auth.signOut();
      redirect(303, '/');
    }
  }
};
