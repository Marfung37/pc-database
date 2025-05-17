import * as fs from 'fs';
import * as lzma from 'lzma-native';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { extendPieces } from './pieces';

const PIECESTONUM: Record<string, number> = {
  T: 0,
  I: 1,
  L: 2,
  J: 3,
  S: 4,
  Z: 5,
  O: 6
};

function queueKey(queue: string): number {
  return Number([...queue].map((p) => PIECESTONUM[p]).join(''));
}

function mapSaves(saves: string): number {
  let val = 0;
  for (const p of saves.split(';')) {
    val |= 1 << PIECESTONUM[p];
  }
  return val;
}

/**
 * Compress path file
 */
export function compressPath(filename: string, pieces: string) {
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

  const compressed = lzma.compress(
    Buffer.from(outputLines.join('\n')),
    9,
    (result: Buffer, err) => {
      if (err) {
      }

      return compressed;
    }
  );
  return compressed;
}

/**
 * Decompress path file
 * Not streamed as files are small and additional work afterwards
 */
export function decompressPath(data: Buffer) {
  const decompressed = lzma.decompress(data, 9, (result: Buffer) => result);
}
