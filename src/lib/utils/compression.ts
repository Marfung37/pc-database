import * as fs from 'fs';
import * as lzma from 'lzma-native';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { extendPieces } from './pieces';
import type { Result } from './types';

const PIECESTONUM: Record<string, number> = {
  T: 0,
  I: 1,
  L: 2,
  J: 3,
  S: 4,
  Z: 5,
  O: 6
};

const NUMTOPIECES: string = 'TILJSZO';

const COLUMN_ORDER = [
  'ツモ', // Queue
  '対応地形数', // Fumen count
  '使用ミノ', // Used pieces
  '未使用ミノ', // Unused pieces
  'テト譜' // Fumens
];

function queueKey(queue: string): number {
  return Number([...queue].map((p) => PIECESTONUM[p]).join(''));
}

function mapSaves(saves: string): number {
  return saves.split(';').reduce((mask, p) => mask | (1 << PIECESTONUM[p]), 0);
}

function unmapSaves(mask: number): string {
  return Array.from(NUMTOPIECES)
    .filter((_, i) => mask & (1 << i))
    .join(';');
}

function strictParseInt(str: string): number {
  // only nonnegative integers
  if (!/^\d+$/.test(str)) throw new Error('Invalid integer');
  return parseInt(str, 10);
}

/**
 * Compress path file
 */
export async function compressPath(filename: string, pieces: string): Result<Buffer> {
  const inputCsv = fs.readFileSync(filename, 'utf-8');
  const records: Record<string, string>[] = parse(inputCsv, {
    columns: true,
    skip_empty_lines: true
  });

  records.sort((a, b) => queueKey(a['ツモ']) - queueKey(b['ツモ']));

  const fumens: Record<string, number> = {};

  for (const row of records) {
    const rowFumens = row['テト譜'].trim().split(';');
    for (let i = 0; i < rowFumens.length; i++) {
      const f = rowFumens[i];
      if (!(f in fumens)) {
        fumens[f] = Object.keys(fumens).length;
      }
      rowFumens[i] = fumens[f].toString();
    }
    row['テト譜'] = rowFumens.join(';');
    row['未使用ミノ'] = mapSaves(row['未使用ミノ']).toString();

    delete row['ツモ'];
    delete row['対応地形数'];
    delete row['使用ミノ'];
  }

  const fumensKeys = Object.keys(fumens);
  const outputLines = [
    pieces,
    '',
    ...fumensKeys,
    '',
    stringify(records, {
      header: true,
      columns: Object.keys(records[0])
    }).trim()
  ];

  try {
    // TODO: not sure this even throws an error
    const compressed = await lzma.compress(Buffer.from(outputLines.join('\n')), { preset: 9 });

    // Validate output (though lzma-native should always return Buffer)
    if (!Buffer.isBuffer(compressed)) {
      return { data: null, error: new Error('Compression returned invalid data') };
    }

    return { data: compressed, error: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    error.message = `Compression failed: ${error.message}`;

    return { data: null, error };
  }
}

/**
 * Decompress path file
 * Not streamed as files are small and additional work afterwards
 * @param data - Compressed data
 * @param level - Decompression level (1-4):
 *   - `0`: Decompresses with xz only
 *   - `1`: Adds back queues
 *   - `2`: Adds back pieces unused
 *   - `3`: Adds back fumens and number of fumens
 *   - `4`: Adds back pieces used
 *   - Any higher number: Processes all levels
 *
 * @returns csv file as a string except for level 0
 */
export async function decompressPath(data: Buffer, level: number = 4): Result<string> {
  let decompressed;
  try {
    decompressed = await lzma.decompress(data);

    // Validate output (though lzma-native should always return Buffer)
    if (!Buffer.isBuffer(decompressed)) {
      return { data: null, error: new Error('Decompression returned invalid data') };
    }
  } catch (err) {
    // Convert to proper Error instance
    const error = err instanceof Error ? err : new Error(String(err));
    error.message = `Decompression failed: ${error.message}`;

    return { data: null, error };
  }

  if (level <= 0) return { data: decompressed.toString(), error: null };

  // get data for each section
  const [pieces, ...rest] = decompressed.toString().split('\n\n');
  const [fumens, csv] = [rest[0].split('\n'), rest[1]];

  // get queues from the pieces
  const queues: string[] = extendPieces(pieces);

  // add back data to csv
  const records: Record<string, string>[] = parse(csv, {
    columns: true,
    skip_empty_lines: true
  });

  for (let i = 0; i < records.length; i++) {
    const row = records[i];

    row['ツモ'] = queues[i]; // queue
    if (level >= 2) {
      try {
        row['未使用ミノ'] = unmapSaves(strictParseInt(row['未使用ミノ'])); // saves
      } catch (err) {
        return {
          data: null,
          error: new Error(
            `Invalid saves in row ${i} (${row['未使用ミノ']}): ${(err as Error).message}`
          )
        };
      }
    }
    if (level >= 3) {
      const rowKeyFumens = row['テト譜'].split(';');
      try {
        row['テト譜'] = rowKeyFumens.map((key) => fumens[strictParseInt(key)]).join(';'); // fumens
      } catch (err) {
        return {
          data: null,
          error: new Error(
            `Invalid fumen key in row ${i} (${row['テト譜']}): ${(err as Error).message}`
          )
        };
      }
      row['対応地形数'] = rowKeyFumens.length.toString(); // number of fumens
    }
    if (level >= 4) {
      const sortedQueue = [...row['ツモ']].sort((a, b) => PIECESTONUM[a] - PIECESTONUM[b]).join('');
      row['使用ミノ'] = row['未使用ミノ']
        .split(';')
        .map((save) => sortedQueue.replace(new RegExp(save), ''))
        .join(';'); // pieces used
    }
  }

  return {
    data: stringify(records, {
      header: true,
      columns: COLUMN_ORDER.filter((col) => !(col in Object.keys(records[0])))
    }).trim(),
    error: null
  };
}
