// Mirgration from v1 to v2 with new setup id format and translation tables

import { supabaseAdmin } from './lib/supabaseAdmin';

type Mirgration = {
  oldId: string;
  newId: string;
  storageOldName: string;
  storageNewName: string;
};

async function runUploads(batchSize: number = 1000, dry: boolean = true) {
  let from = 0;
  let done = false;
  const srcIds: Set<string> = new Set();

  const destIds: Set<string> = new Set();

  const setupMigration: Mirgration[] = [];

  while (!done) {
    const { data: setups, error: setupErr } = await supabaseAdmin
      .from('setups')
      .select(`setup_id`)
      .range(from, from + batchSize - 1);

    if (setupErr) {
      throw setupErr;
    }

    for (let setup of setups) {
      let down = false;
      const chainIds: Set<string> = new Set();
      const setupStack = [];
      do {
        if (srcIds.has(setup.setup_id)) break;
        srcIds.add(setup.setup_id);

        if (chainIds.has(setup.setup_id)) {
          console.log(Array.from(chainIds));
          throw 'Cycle detected';
        } else {
          chainIds.add(setup.setup_id);
        }

        down = false;

        let change = parseInt(setup.setup_id.slice(1, 4), 16);
        change = (((change << 1) | (change >> 10)) & 0xffe) | (change & 1);

        const setupid =
          setup.setup_id[0] + change.toString(16).padStart(3, '0') + setup.setup_id.slice(4);

        if (destIds.has(setupid)) {
          throw Error(`${setupid} already found`);
        } else {
          destIds.add(setupid);
        }

        setupStack.push({
          oldId: setup.setup_id,
          newId: setupid,
          storageOldName: setup.setup_id + '-srs180-any.csvd.xz',
          storageNewName: setupid + '-srs180-any.csvd.xz'
        });

        // unchanged so don't need to check for chain
        if (setupid === setup.setup_id) {
          break;
        }

        const { data, error } = await supabaseAdmin
          .from('setups')
          .select('setup_id')
          .eq('setup_id', setupid);

        if (error) {
          throw error;
        }

        if (data.length > 0) {
          setup = data[0];
          down = true;
        }
      } while (down);

      for (const setup of setupStack.reverse()) {
        setupMigration.push(setup);
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

  if (dry) {
    console.log(setupMigration.slice(0, 50));
    console.log(setupMigration.length);
    return;
  }

  // update from top of stack down
  for (let i = 0; i < setupMigration.length; i++) {
    const setup = setupMigration[i];
    console.log(setup);
    if (setup.oldId === setup.newId) continue;

    const { error } = await supabaseAdmin
      .from('setups')
      .update({ setup_id: setup.newId })
      .eq('setup_id', setup.oldId);

    if (error) {
      throw error;
    }

    // const { data, error: storageExistErr } = await supabaseAdmin.storage.from('path').exists(setup.storageOldName)
    //
    // // if (storageExistErr)
    // //   throw storageExistErr;
    //
    // if (data) {
    //   const { error: storageErr } = await supabaseAdmin.storage.from('path')
    //     .move(setup.storageOldName, setup.storageNewName)
    //
    //   if (storageErr) {
    //     throw storageErr
    //   }
    // }
    //

    console.log(`Updated ${setup.oldId} to ${setup.newId}`);
  }
}

await runUploads(1000, false);
