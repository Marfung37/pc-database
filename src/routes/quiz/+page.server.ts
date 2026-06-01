import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const presets: { filename: string; name: string }[] = [
  { filename: 'Beginner-2nd.json', name: 'Beginner 2nd' },
  { filename: 'Beginner-2nd-T-one-LJ.json', name: 'Beginner 2nd T one L/J' },
  { filename: 'Beginner-2nd-T-or-even-LJ.json', name: 'Beginner 2nd T or even LJ' }
];

export const load: PageServerLoad = async () => {
  return { presets };
};

export const actions: Actions = {
  quizPreset: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const filename = formData.get('preset') as string;

    // TODO: change bucket name to something else
    const { data, error: storageError } = await supabase.storage
      .from('covertree')
      .download(filename);

    if (storageError) {
      console.error('Supabase download error:', storageError);
      throw error(500, 'Failed to fetch data from storage.');
    }

    try {
      const textData = await data.text();
      const coverSet = JSON.parse(textData);
      return {
        coverSet
      };
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      throw error(500, 'Invalid JSON format in stored file.');
    }
  }
};
