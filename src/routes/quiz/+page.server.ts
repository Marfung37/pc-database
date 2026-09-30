import { error } from '@sveltejs/kit';
import { formAction } from '$lib/server/forms';
import { z } from 'zod';
import { m } from '$lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

const presets: { filename: string; name: string }[] = [
  { filename: 'Beginner-2nd.json', name: 'Beginner 2nd' },
  { filename: 'Beginner-2nd-T-one-LJ.json', name: 'Beginner 2nd T one L/J' },
  { filename: 'Beginner-2nd-T-or-even-LJ.json', name: 'Beginner 2nd T or even LJ' }
];

export const load: PageServerLoad = async () => {
  return { presets };
};

const quizPresetSchema = () => z.object({
  preset: z.string()
})

export const actions: Actions = {
  quizPreset: formAction(quizPresetSchema(), async ({ data: { preset }, locals: { supabase } }) => {
    // TODO: change bucket name to something else
    const { data, error: storageError } = await supabase.storage
      .from('covertree')
      .download(preset);

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
  })
};
