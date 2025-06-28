import { COLUMN_ORDER } from './compression';
import { grayFumen } from './fumenUtils';
import { createObjectCsvWriter } from 'csv-writer';
import { Result } from './types';

// if the fumen is a PC, path command fails so generate manually
export async function generatePCPath(fumen: string, queues: string[], output: string): Result<null> {
  const csvWriter = createObjectCsvWriter({
    path: output,
    header: [
      { id: 'queue', title: COLUMN_ORDER[0] },
      { id: 'fumen_count', title: COLUMN_ORDER[1] },
      { id: 'used_pieces', title: COLUMN_ORDER[2] },
      { id: 'unused_pieces', title: COLUMN_ORDER[3] },
      { id: 'fumens', title: COLUMN_ORDER[4] },
    ]
  })

  // make fumen grayed out
  fumen = grayFumen(fumen);

  interface Record {
    queue: string;
    fumen_count: number;
    used_pieces: string;
    unused_pieces: string;
    fumens: string;
  }

  const records: Record[] = [];
  for (let q of queues) {
    // make sure queues are only one piece long
    if (q.length > 1) {
      return {data: null, error: Error('Given queues for setup that\'s already a pc contain length greater than 1')};
    }
    records.push({ queue: q, fumen_count: 1, used_pieces: '', unused_pieces: q, fumens: fumen })
  }

  await csvWriter.writeRecords(records);

  return {data: null, error: null};
}
