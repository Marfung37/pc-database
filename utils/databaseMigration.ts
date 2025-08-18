// Mirgration from v1 to v2 with new setup id format and translation tables

import { supabaseAdmin } from './lib/supabaseAdmin';
import { hashFumen } from './lib/id';

async function runUploads(batchSize: number = 1000) {
  let from = 0;
  let done = false;
  const prefixMap: Map<string, number> = new Map();
  const oldSetupIdSet: Set<string> = new Set();
  const setupIdSet: Set<string> = new Set();

  while (!done) {
    const { data: setups, error: setupErr } = await supabaseAdmin
      .from('setups')
      .select(`setup_id, fumen`)
      .range(from, from + batchSize - 1);

    if (setupErr) {
      throw setupErr;
    }
    
    for (let setup of setups) {
      if (setup.setup_id in oldSetupIdSet) continue;

      let setupStack: any[] = [];
      let down = false;
      do {
        down = false;
        let prefix = setup.setup_id.slice(0, -4)
        prefix += ((parseInt(setup.setup_id[8], 16) & 0b1100) | hashFumen(setup.fumen)).toString(16);

        // determine the unique id
        let uniqueId = prefixMap.get(prefix);
        if (uniqueId === undefined) {
          uniqueId = 0xfff;
          prefixMap.set(prefix, uniqueId);
        } else {
          prefixMap.set(prefix, uniqueId - 1);
        }

        const setupid = prefix + uniqueId.toString(16);

        if(setupid in setupIdSet) {
          throw Error(`${setupid} already found`);
        } else {
          setupIdSet.add(setupid);
        }

        setupStack.push({...setup, new_setup_id: setupid});

        const { data, error } = await supabaseAdmin
          .from('setups')
          .select('setup_id, fumen')
          .eq('setup_id', setupid);

        if (error) {
          throw error;
        }

        if (data.length > 0) {
          setup = data[0];
          down = true;
        }
      } while (down);

      // update from top of stack down
      for (let i = setupStack.length - 1; i >= 0; i--) {
        const setup = setupStack[i];
        const { error } = await supabaseAdmin
          .from('setups')
          .update({'setup_id': setup.new_setup_id})
          .eq('setup_id', setup.setup_id);
        
        if (error) {
          throw error;
        }
        console.log(`Updated ${setup.setup_id} to ${setup.new_setup_id}`);
        oldSetupIdSet.add(setup.setup_id);
      }
      
      from++;
    }

    if (setups && setups.length > 0) {
      if (setups.length < batchSize) {
        done = true; // last page
      }
    } else {
      done = true;
    }

  }

  // Update setup id and corresponding setup id for path file
}

await runUploads();
