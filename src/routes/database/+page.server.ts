import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const columns = [
    {
      id: 'setup_id',
      header: 'Setup ID',
      footer: 'Setup ID',
      width: 150,
      treetoggle: true,
      resize: true
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
      flexgrow: 1,
      resize: true,
      editor: 'text'
    },
    {
      id: 'fumen',
      header: 'Fumen',
      footer: 'Fumen',
      width: 200,
      flexgrow: 1,
      resize: true,
      editor: 'text'
    },
    {
      id: 'pieces',
      header: 'Pieces',
      footer: 'Pieces',
      width: 100,
      flexgrow: 1,
      resize: true,
      editor: 'text'
    },
    {
      id: 'mirror',
      header: 'Mirror',
      footer: 'Mirror',
      width: 120
    },
    {
      id: 'oqb_path',
      header: 'OQB Path',
      footer: 'OQB Path',
      width: 150,
      flexgrow: 1,
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

    // get non oqb setups
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
      .is('oqb_path', 'NULL')
      .eq('statistics.kicktable', 'srs180')
      .order('setup_id', { ascending: true });

    if (error) {
      console.error('Failed to get data:', error.message);
      return fail(500, {
        success: false,
        message: `Failed to get data.`
      });
    }

    let gridData = data.map((x) => {
      return { ...x, solve_percent: x.statistics[0].solve_percent };
    });

    // populate the oqb setups
    const { data: oqbDataTmp, error: oqbErr } = await supabase
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
        .eq('oqb_depth', 0)
        .eq('statistics.kicktable', 'srs180')
        .order('setup_id', { ascending: true });

      if (oqbErr) {
        console.error('Failed to get data:', oqbErr.message);
        return fail(500, {
          success: false,
          message: `Failed to get data.`
        });
      }

    if (!oqbDataTmp) return { success: true, gridData }

    let oqbData = oqbDataTmp.map((x) => {
      return { ...x, solve_percent: x.statistics[0].solve_percent };
    });

    // @ts-expect-error TODO: set the type
    async function populateOqbTree(data, depth: number = 1) {
      for (let i = 0; i < data.length; i++) {
        const { data: oqbDataTmp, error: oqbErr } = await supabase
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
          .like('oqb_path', data[i]['oqb_path'] + '.%')
          .eq('oqb_depth', depth)
          .eq('statistics.kicktable', 'srs180')
          .order('setup_id', { ascending: true });


        if (oqbData.length == 0) return;

        if (oqbErr) {
          throw oqbErr;
        }

        let cleanUpData = oqbDataTmp.map((x) => {
          return { ...x, solve_percent: x.statistics[0].solve_percent };
        })

        await populateOqbTree(cleanUpData, depth + 1);

        if (cleanUpData.length > 0) {
          data[i].data = cleanUpData;
          data[i].open = false;
        }
      }
    };

    try {
      await populateOqbTree(oqbData);
    } catch (oqbErr) {
      console.error('Failed to get data:', (oqbErr as Error).message);
      return fail(500, {
        success: false,
        message: `Failed to get data.`
      });
    }

    gridData = [...gridData, ...oqbData];

    return {
      success: true,
      gridData
    };
  }
};
