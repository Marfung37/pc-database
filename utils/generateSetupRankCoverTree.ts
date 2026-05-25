import type { Queue, Fumen, SetupID, Kicktable, HoldType } from './lib/types';
import { extendPieces } from './lib/pieces';
import { supabaseAdmin } from './lib/supabaseAdmin';
import { indexBytea } from './lib/utils/utils';
import { BAG } from './lib/constants';

// TreeNode has keys of pieces and can be another node or index of array
type TreeNode = {
  [K in typeof BAG[number]]?: TreeNode | number;
}

class Tree {
  public root: TreeNode;

  constructor() {
    this.root = {};
  }

  insertNoUpdatePath(path: Queue, value: number): void {
    let currentNode: TreeNode = this.root;
    for (let i = 0; i < path.length; i++) {
      let step = path[i];
      // populate branch if not exist
      if (!currentNode[step]) {
        if (i == path.length - 1) {
          currentNode[step] = value;
          return;
        }
        currentNode[step] = {} as TreeNode;
      }

      // if path already populated
      if (typeof currentNode[step] === 'number') return;

      // go to next node
      currentNode = currentNode[step];
    }
  }
}

function insertSetupCover(tree: Tree, coverData: string, coverPattern: string, value: number) {
  let queues = extendPieces(coverPattern) as Queue[];
  for (let i = 0; i < queues.length; i++) {
    if (indexBytea(coverData, i)) {
      tree.insertNoUpdatePath(queues[i], value);
    }
  }
}

async function getCoverTree(ranking: SetupID[], kicktable: Kicktable = 'srs180', hold_type: HoldType = 'any'): Promise<string | null> {
  let targets = ranking
    .map(t => {return {setup_id: t, kicktable, hold_type}})
 
  const {data, error} = await supabaseAdmin.rpc("get_cover_fumen", {targets});

  if (error) {
    console.error('Failed to get cover info:', error.message);
    return null;
  }

  const tree = new Tree();
  const setups: Fumen[] = [];

  for (let [index, row] of data.entries()) {
    insertSetupCover(tree, row.cover_data, row.cover_pattern, index);
    setups.push(row.fumen);
  }

  return JSON.stringify({
    setups,
    tree: tree.root
  })
}

import { readFileSync, writeFileSync } from 'fs';

let lines: SetupID[] = readFileSync('tmp/2ndranking.txt', 'utf-8')
  .split(/\r?\n/)          
  .map(line => line.trim()) 
  .filter(line => line !== "")
  .map(line => line as SetupID) 

const data = await getCoverTree(lines);
if (data !== null) 
  writeFileSync('tmp/output.json', data);
