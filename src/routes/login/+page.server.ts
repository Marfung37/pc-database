import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, locals: { getSafeSession } }) => {
  const { session } = await getSafeSession();

  // if the user is already logged in return them to the account page
  if (session) {
    redirect(303, '/account');
  }

  return { url: url.origin };
};

export const actions: Actions = {
  default: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const validEmail = /^[\w-.+]+@([\w-]+\.)+[\w-]{2,8}$/.test(email);
    if (!validEmail) {
      return fail(400, { errors: { email: 'Please enter a valid email address' }, email });
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    // DEBUG
    console.log(error);

    if (error) {
      return fail(400, {
        success: false,
        email,
        message: `Failed to login. Invalid email or password.`
      });
    }

    return {
      success: true
    };
  }
};
