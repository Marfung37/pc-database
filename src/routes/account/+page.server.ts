import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
  const { session, user } = await safeGetSession();
  console.log(session, user);

  if (!session) {
    redirect(303, '/');
  }

  const { data: profile } = await supabase
    .from('users')
    .select(`username`)
    .eq('user_id', session.user.id)
    .single();

  return { session, profile };
};

export const actions: Actions = {
  update: async ({ request, locals: { supabase, safeGetSession } }) => {
    const formData = await request.formData();
    const username = formData.get('username') as string;

    const { session } = await safeGetSession();

    const { error } = await supabase.from('users').upsert({
      user_id: session?.user.id,
      username
    });

    if (error) {
      return fail(500, {
        username
      });
    }

    return {
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
