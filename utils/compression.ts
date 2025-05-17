import * as fs from 'fs';
import * as lzma from 'lzma-native';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const PIECESTONUM: Record<string, number> = {
  T: 0,
  I: 1,
  L: 2,
  J: 3,
  S: 4,
  Z: 5,
  O: 6,
};

function queueKey(queue: string): number {
  return Number([...queue].map(p => PIECESTONUM[p]).join(''));
}

function mapSaves(saves: string): number {
  let val = 0;
  for (const p of saves.split(';')) {
    val |= 1 << PIECESTONUM[p];
  }
  return val;
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .version(false)
    .option('input', {
      alias: 'i',
      type: 'string',
      demandOption: true,
      describe: 'Input CSV file path',
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      demandOption: true,
      describe: 'Output file name (with .csvd extension)',
    })
    .option('pieces', {
      alias: 'p',
      type: 'string',
      describe: 'Header line to prefix in the output',
      demandOption: true
    })
    .strict()
    .help()
    .parse();

  const inputCsv = fs.readFileSync(argv.input, 'utf-8');
  const records: Record<string, string>[] = parse(inputCsv, {
    columns: true,
    skip_empty_lines: true,
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
    argv.pieces,
    '',
    ...fumensKeys,
    '',
    stringify(records, {
      header: true,
      columns: Object.keys(records[0]),
    }).trim(),
  ];

  lzma.compress(Buffer.from(outputLines.join('\n')), { preset: 6 }, (compressed: Buffer) => {
    fs.writeFileSync(argv.output + '.xz', compressed);
    console.log(`✅ Wrote ${argv.output}.xz with ${records.length} entries`);
  });
}

main();
