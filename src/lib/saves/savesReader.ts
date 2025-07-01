import * as fs from 'fs';
import * as csv from 'csv-parse/sync';
import { PCNUM2LONUM, LONUM2BAGCOMP } from '$lib/utils/formulas';
import { sortQueue } from '$lib/utils/queueUtils';
import { fumenGetComments} from '$lib/utils/fumenUtils';
import { 
  BAG, 
  PCSIZE, 
  COLUMN_QUEUE, 
  COLUMN_UNUSED_PIECES,
  COLUMN_UNUSED_PIECES_DELIMITER,
  COLUMN_FUMENS,
  COLUMN_FUMENS_DELIMITER
} from '$lib/constants';
import type { Queue } from '$lib/types';

const REQUIRED_COLUMNS = new Set([
  COLUMN_QUEUE,
  COLUMN_UNUSED_PIECES,
  COLUMN_FUMENS,
]);

// Helper to get the multiset difference
function multisetDifference(str1: string, str2: string): Record<string, number> {
  const count1: Record<string, number> = {};
  for (const c of str1) count1[c] = (count1[c] ?? 0) + 1;
  for (const c of str2) count1[c] = (count1[c] ?? 0) - 1;
  return count1;
}

// Convert count object to set of elements with positive counts
function multisetToSet(count: Record<string, number>): Set<string> {
  const result = new Set<string>();
  for (const [k, v] of Object.entries(count)) {
    if (v > 0) result.add(k);
  }
  return result;
}

function getUnusedLastBag(
  build: string,
  leftover: string,
  bagComp: number[]
): Set<string> {
  let lastBagPiecesUsed: Record<string, number>;
  if (bagComp.length < 3) {
    lastBagPiecesUsed = multisetDifference(build, leftover);
  } else {
    lastBagPiecesUsed = multisetDifference(build, leftover + BAG);
  }
  const unusedLastBagCount = multisetDifference(BAG, Object.entries(lastBagPiecesUsed)
    .flatMap(([k, v]) => k.repeat(v > 0 ? v : 0)).join(''));
  return multisetToSet(unusedLastBagCount);
}

// Type for a parsed CSV row
export interface SavesRow {
  saves: string[];
  solveable: boolean;
  queue: string;
  fumens?: string[][];
  line?: Record<string, string>;
}

export class SavesReader {
  private unusedLastBag: Set<string>;
  private leadingSize: number;
  private records: Record<string, string>[];

  constructor(
    private build: string,
    private leftover: string,
    private pcNum: number,
    private filepath: string | null = null,
    fileData: string | null = null,
    private twoline = false,
    private hold = 1,
  ) {
    const bagComp = LONUM2BAGCOMP(PCNUM2LONUM(pcNum), twoline ? 6 : 11);
    this.unusedLastBag = getUnusedLastBag(build, leftover, bagComp);
    this.leadingSize = Math.max(bagComp.slice(0, -1).reduce((a, b) => a + b, 0), build.length);

    if (fileData === null && filepath === null) {
      throw new Error('Either filepath or records must be filled for saves reader')
    }
    
    const csvContent = (fileData !== null) ? fileData : fs.readFileSync(filepath!, 'utf-8');
    const parsed = csv.parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
    });
    this.records = parsed;

    const fieldnames = Object.keys(parsed[0] ?? {});
    const missing = [...REQUIRED_COLUMNS].filter(c => !fieldnames.includes(c));
    if (missing.length > 0) {
      throw new Error(`Missing required columns: ${missing.join(', ')}`);
    }
  }

  *read(assignFumens = false, assignLine = false): Generator<SavesRow> {
    const fumenLabels: Record<string, number> = {};
    const VALID_4L_PCSIZE = new Set([PCSIZE, PCSIZE + this.hold]);
    const VALID_2L_PCSIZE = new Set([PCSIZE / 2, PCSIZE / 2 + this.hold]);

    for (const row of this.records) {
      const saves: string[] = [];
      const saveFumens: string[][] = [];
      const solveable = row[COLUMN_FUMENS] !== '';

      if (!solveable) {
        const saveRow: SavesRow = {
          saves: [],
          solveable,
          queue: row[COLUMN_QUEUE],
        };
        if (assignFumens) saveRow.fumens = [];
        if (assignLine) saveRow.line = row;
        yield saveRow;
        continue;
      }

      const fullQueue = this.build + row[COLUMN_QUEUE];
      const validLength =
        VALID_4L_PCSIZE.has(fullQueue.length) ||
        (this.twoline && VALID_2L_PCSIZE.has(fullQueue.length));

      if (!validLength) {
        throw new Error(
          `Full queue could not produce a ${this.twoline ? '2' : '4'}l PC. Likely build '${this.build}' is too short.`
        );
      }

      const unseenLastBagPart = new Set(
        [...this.unusedLastBag].filter(
          p => !fullQueue.slice(this.leadingSize).includes(p)
        )
      );

      const queueValue = [...row[COLUMN_QUEUE]].reduce(
        (sum, c) => sum + c.charCodeAt(0),
        0
      );

      for (const unusedPiece of row[COLUMN_UNUSED_PIECES].split(COLUMN_UNUSED_PIECES_DELIMITER)) {
        let save = [...unseenLastBagPart].join('') + unusedPiece;
        save = sortQueue(save as Queue);
        saves.push(save);

        if (assignFumens) {
          const currSaveFumens: string[] = [];
          for (const fumen of row[COLUMN_FUMENS].split(COLUMN_FUMENS_DELIMITER)) {
            if (!(fumen in fumenLabels)) {
              const comment = fumenGetComments(fumen)[0];
              fumenLabels[fumen] = [...comment].reduce(
                (s, c) => s + c.charCodeAt(0),
                0
              );
            }
            const commentValue = fumenLabels[fumen];
            const fumenUnusedPiece = String.fromCharCode(queueValue - commentValue);
            if (unusedPiece === fumenUnusedPiece) {
              currSaveFumens.push(fumen);
            }
          }
          saveFumens.push(currSaveFumens);
        }
      }

      const saveRow: SavesRow = {
        saves,
        solveable,
        queue: row[COLUMN_QUEUE],
      };
      if (assignFumens) saveRow.fumens = saveFumens;
      if (assignLine) saveRow.line = row;

      yield saveRow;
    }
  }
}
