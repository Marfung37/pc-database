import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals: { supabase } }) => {
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
      width: 150
    },
    {
      id: 'fumen',
      header: 'Fumen',
      footer: 'Fumen'
    },
    {
      id: 'pieces',
      header: 'Pieces',
      footer: 'Pieces',
      width: 100
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
      width: 100
    },
    {
      id: 'solve_percent',
      header: 'Solve %',
      footer: 'Solve %',
      width: 100
    }
  ];

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
    .eq('statistics.kicktable', 'srs180');

  if (error) {
    console.error('Failed to get database data:', error.message);
    return { gridData: [], columns };
  }

  return { gridData: data, columns };
};
