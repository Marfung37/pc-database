import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, getSafeSession } }) => {
  const { session, user_id } = await getSafeSession();

  if (!session) {
    redirect(303, '/');
  }

  const { data: profile, error: profileErr } = await supabase
    .from('users')
    .select('username')
    .eq('user_id', user_id)
    .single();

  if (profileErr) {
    console.error('Failed to get profile for user', user_id);
  }

  return { session, profile };
};

export const actions: Actions = {
  update: async ({ request, locals: { supabase, getSafeSession } }) => {
    const formData = await request.formData();
    const username = formData.get('username') as string;

    const { user_id } = await getSafeSession();

    const { data, error } = await supabase
      .from('users')
      .update({ username })
      .eq('user_id', user_id)
      .select();

    if (error) {
      console.error('Failed to update user:', error.message);
      return fail(500, {
        username
      });
    }

    if (!data) {
      // no rows updated
      console.error(`Failed to update user with id ${user_id} or does not exist`);
      return fail(500, {
        username
      });
    }

    return {
      username
    };
  },
  signout: async ({ locals: { supabase, getSafeSession } }) => {
    const { session } = await getSafeSession();
    if (session) {
      await supabase.auth.signOut();
      redirect(303, '/');
    }
  }
};
