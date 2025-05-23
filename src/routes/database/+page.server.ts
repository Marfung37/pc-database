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

// 1. Define Types
// Extend the base Setup interface to include the nested 'data' for the tree structure
interface BaseSetup {
  setup_id: string;
  leftover: string;
  build: string;
  cover_dependence: string;
  fumen: string;
  pieces: string;
  mirror: boolean;
  oqb_path: string | null;
  oqb_depth: number | null; // Assuming this column exists and is used
}

// Define the shape of the statistics data when embedded
interface StatisticsData {
  solve_percent: number;
}

// Combined type for data coming directly from Supabase, before flattening statistics
interface RawSetup extends BaseSetup {
  statistics: StatisticsData[] | null; // Null if no related statistics due to UNIQUE constraint
}

// Type for data after processing (flattened statistics and nested 'data' for children)
interface ProcessedSetup extends BaseSetup {
  solve_percent: number | null; // Flattened solve_percent, can be null
  data?: ProcessedSetup[]; // Children in the tree structure
  open?: boolean; // For UI state if you plan to use it (e.g., in a tree view)
}

// Helper to safely extract and flatten solve_percent
function processSetupData(rawSetups: RawSetup[] | null): ProcessedSetup[] {
    if (!rawSetups) return [];
    return rawSetups.map(s => ({
        ...s,
        solve_percent: s.statistics?.[0].solve_percent || null // Safely access and default to null
    }));
}

/**
 * Builds the OQB tree structure from a flat list of ProcessedSetup objects.
 * Assumes the input `allSetups` are already filtered by `pc` and `kicktable`.
 *
 * @param allSetups A flat array of all relevant ProcessedSetup objects.
 * @returns The root nodes of the OQB tree with their children populated.
 */
function buildOqbTree(allSetups: ProcessedSetup[]): ProcessedSetup[] {
    const setupMap = new Map<string, ProcessedSetup>();
    const rootNodes: ProcessedSetup[] = [];

    // First pass: Populate map and add a 'children' array
    // Also initialize 'open' state for UI if needed
    for (const setup of allSetups) {
        setup.data = []; // Initialize children array
        setup.open = false; // Initialize UI state
        setupMap.set(setup.setup_id, setup);
    }

    // Second pass: Assign children to their parents
    for (const setup of allSetups) {
        if (setup.oqb_depth == 0) {
            rootNodes.push(setup);
        } else if (setup.oqb_path !== null) {
            // Extract parent setup_id from oqb_path
            const pathParts = setup.oqb_path.split('.');
            const parentId = pathParts[pathParts.length - 2]; // Last part is the parent setup_id

            const parent = setupMap.get(parentId);
            if (parent) {
                // Ensure data is initialized before pushing
                if (!parent.data) {
                    parent.data = [];
                }
                parent.data.push(setup);
            } else {
                // This scenario means a child has an oqb_path pointing to a non-existent parent
                // or a parent that wasn't fetched in the 'allSetups' list (e.g., beyond max depth).
                // You might want to log a warning or handle this edge case.
                console.warn(`Parent setup_id ${parentId} not found for child ${setup.setup_id}`);
                // If a parent is not found, this setup might become a root node or be dropped.
                // For now, let's assume all parents will be in the map if fetched.
            }
        }
    }

    // Sort children for consistent display
    rootNodes.forEach(root => {
        if (root.data && root.data.length > 0) {
            sortChildren(root.data);
        }
    });

    return rootNodes;
}

// Helper to sort children (recursive sort for consistency)
function sortChildren(children: ProcessedSetup[]) {
    children.sort((a, b) => a.setup_id.localeCompare(b.setup_id)); // Or sort by a more meaningful field
    children.forEach(child => {
        if (child.data && child.data.length > 0) {
            sortChildren(child.data);
        }
    });
}

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

    // 1. Fetch ALL relevant setups in one query
    // This query gets all setups with the given 'pc' and kicktable filter,
    // and sorts them by oqb_path for easier processing.
    const { data: allRelevantSetupsRaw, error: fetchError } = await supabase
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
        oqb_depth,
        statistics (solve_percent)`
      )
      .eq('pc', pc)
      .eq('statistics.kicktable', 'srs180') // Apply kicktable filter once
      .order('oqb_depth', { ascending: true }) // Order by depth first
      .order('oqb_path', { ascending: true }); // Then by path for consistent tree building

    if (fetchError) {
      console.error('Failed to get all setups:', fetchError.message);
      return fail(500, {
        success: false,
        message: `Failed to load setups: ${fetchError.message}`
      });
    }

    const allSetupsProcessed = processSetupData(allRelevantSetupsRaw);

    // 2. Separate non-OQB setups from OQB candidates
    const nonOqbSetups = allSetupsProcessed.filter(s => s.oqb_path === null);
    const oqbTreeCandidates = allSetupsProcessed.filter(s => s.oqb_path !== null);

    // 3. Build the OQB tree in-memory
    // Pass only the candidates that could be part of the OQB tree to the builder
    const oqbTree = buildOqbTree(oqbTreeCandidates);

    // Combine all data for the grid
    // The final gridData should be the non-OQB setups + the root nodes of the OQB tree
    // The buildOqbTree function should return the actual root nodes it processed,
    // and those would be the top-level items in your grid.
    const gridData = [...nonOqbSetups, ...oqbTree];

    return {
      success: true,
      gridData
    };
  }
};
