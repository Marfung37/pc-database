import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const columns = [
    {
      id: 'setup_id',
      width: 150,
      header: 'Setup ID',
      footer: 'Setup ID'
    },
    {
      id: 'leftover',
      width: 100,
      header: 'Leftover',
      footer: 'Leftover'
    },
    {
      id: 'build',
      header: 'Build',
      footer: 'Build',
      width: 100
    },
    {
      id: 'cover_dependence',
      header: 'Cover Dependence',
      footer: 'Cover_Dependence',
      width: 150,
      resize: true,
      editor: 'text'
    },
    {
      id: 'fumen',
      header: 'Fumen',
      footer: 'Fumen',
      resize: true,
      editor: 'text'
    },
    {
      id: 'pieces',
      header: 'Pieces',
      footer: 'Pieces',
      width: 100,
      resize: true,
      editor: 'text'
    },
    {
      id: 'mirror',
      header: 'Mirror',
      footer: 'Mirror',
      width: 150
    },
    {
      id: 'oqb_path',
      header: 'OQB Path',
      footer: 'OQB Path',
      width: 100,
      resize: true,
      editor: 'text'
    },
    {
      id: 'solve_percent',
      header: 'Solve %',
      footer: 'Solve %',
      width: 100
    }
  ];

  return { columns };
};

export const actions: Actions = {
  pcnum: async ({ request, locals: { supabase } }) => {
    const formData = await request.formData();
    const pcStr = formData.get('pc') as string;

    // checking if valid pc number
    if (!pcStr.match(/^[1-9]$/)) {
      return fail(400, {
        success: false,
        message: `Invalid pc number.`
      });
    }
    const pc = parseInt(pcStr);
    console.log(pc);

    const { data, error } = await supabase
      .from('setups')
      .select(
        `setup_id,
              leftover, 
              build, 
              cover_dependence, 
              fumen, 
              pieces, 
              mirror, 
              oqb_path,
              statistics (solve_percent)`
      )
      .eq('pc', pc)
      .eq('statistics.kicktable', 'srs180');

    if (error) {
      console.error('Failed to get data:', error.message);
      return fail(500, {
        success: false,
        message: `Failed to get data.`
      });
    }

    const gridData = data.map((x) => {
      return { ...x, solve_percent: x.statistics[0].solve_percent };
    });

    return {
      success: true,
      gridData
    };
  }
};
