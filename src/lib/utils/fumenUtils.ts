import { decoder, encoder, Field, type Page, type Mino } from 'tetris-fumen';
import type { Fumen } from '$lib/types';
import { PCSIZE, mirrorPieces } from '$lib/constants';
import { isMinoPiece } from '$lib/utils/GluingFumens/src/lib/defines';

function getFieldHeight(field: Field): number {
  return field.str({ reduced: true, garbage: false }).split('\n').length;
}

export function is2Line(fumen: string): boolean {
  const pages = decoder.decode(fumen);

  for (const page of pages) {
    if (page.field !== null) {
      const lines = page.field.str({ reduced: true, garbage: false }).split('\n');

      if (lines.length != 2 || lines.some((x) => x.includes('_'))) {
        return false;
      }
    }
  }

  return true;
}

export function isPC(fumen: string): boolean {
  const pages = decoder.decode(fumen);

  for (const page of pages) {
    if (page.field !== null) {
      const lines = page.field.str({ reduced: true, garbage: false }).split('\n');

      if (lines.some((x) => x.includes('_'))) {
        return false;
      }
    }
  }

  return true;
}

export function getHeight(fumen: string): number {
  const pages = decoder.decode(fumen);
  let height = 0;

  for (const page of pages) {
    if (page.field !== null) {
      const pageHeight = getFieldHeight(page.field);
      if (height < pageHeight) height = pageHeight;
    }
  }

  return height;
}

export function decodeWrapper(fumen: Fumen): Page[] {
  let pages: Page[];
  try {
    pages = decoder.decode(fumen);
  } catch (_err) {
    throw new Error(`Fumen ${fumen} could not be decoded`);
  }

  return pages;
}

export function grayFumen(fumen: Fumen): Fumen {
  // gray out all colored minos
  const pages = decodeWrapper(fumen);

  for (const page of pages) {
    if (page.field !== null) {
      page.field = Field.create(
        page.field
          .str({ reduced: true, garbage: false })
          .replaceAll(/[TILJSZO]/g, 'X')
          .replaceAll(/[\r\n]/g, '')
      );
    }
  }

  return encoder.encode(pages) as Fumen;
}

export function fumenGetComments(fumen: Fumen): string[] {
  const pages = decodeWrapper(fumen);
  const comments = [];

  for (const page of pages) comments.push(page.comment);

  return comments;
}

export function fumenCombine(fumens: Iterable<Fumen>): Fumen {
  const pages: Page[] = [];
  for (const fumen of fumens) pages.concat(decodeWrapper(fumen));

  return encoder.encode(pages) as Fumen;
}

export function fumenCombineComments(fumens: Fumen[], comments: string[]): Fumen {
  // treats the fumens as if they only have one page (only considers first pages)
  const pages: Page[] = [];
  for (let i = 0; i < Math.min(fumens.length, comments.length); i++) {
    const page = decodeWrapper(fumens[i])[0];
    page.comment = comments[i];
    pages.push(page);
  }

  return encoder.encode(pages) as Fumen;
}

export function fumenSplit(fumen: Fumen): Fumen[] {
  const pages = decodeWrapper(fumen);
  const fumens: Fumen[] = [];

  for (const page of pages) {
    fumens.push(encoder.encode([page]) as Fumen);
  }

  return fumens;
}

export function fumenGetMinos(fumen: Fumen): Mino[] {
  const pages = decodeWrapper(fumen);
  const minos: Mino[] = [];

  for (const page of pages) {
    minos.push(page.mino());
  }

  return minos;
}

/**
 * Get number of filled cells in the first page
 */
export function fumenCountFilledCells(fumen: Fumen): number {
  const page = decodeWrapper(fumen)[0];
  return page.field.str({ reduced: true, garbage: false }).replaceAll(/[_\r\n]/g, '').length;
}

export function isCongruentFumen(
  fumen1: Fumen,
  fumen2: Fumen,
  maxPage: number = Infinity
): boolean {
  if (fumen1 === fumen2) return true;

  // whether two fumens are congruent under shifts
  const pages1 = decodeWrapper(fumen1);
  const pages2 = decodeWrapper(fumen2);

  if (maxPage >= Math.max(pages1.length, pages2.length) && pages1.length !== pages2.length)
    return false;

  for (let i = 0; i < Math.min(pages1.length, pages2.length, maxPage); i++) {
    const field1 = pages1[i].field
      .str({ reduced: true, garbage: false, separator: '\n' })
      .split('\n');
    const field2 = pages2[i].field
      .str({ reduced: true, garbage: false, separator: '\n' })
      .split('\n');

    if (field1.length !== field2.length) return false;

    // check if each row is cycle of other
    let fullShiftSize = -1;
    let leadingSize = PCSIZE;
    let trailingSize = PCSIZE;
    for (let j = 0; j < field1.length; j++) {
      // check if row2 of substring of row1 + row1
      const row2 = field2[j].replaceAll(/[TILJSZOX]/g, '[TILJSZOX]');
      let shiftSize = (field1[j] + field1[j]).search(new RegExp(row2));

      if (shiftSize == -1) return false;

      // move to range [-4,5]
      if (shiftSize > PCSIZE / 2) shiftSize -= PCSIZE;

      // check if shift is same between row
      if (j === 0) fullShiftSize = shiftSize;
      else if (shiftSize !== fullShiftSize) return false;

      // counting full columns
      const rowLeading = field1[j].indexOf('_');
      if (rowLeading === -1) continue;

      const rowTrailing = field1[j].lastIndexOf('_');

      // give size of leading and trailing sizes
      if (rowLeading < leadingSize) leadingSize = rowLeading;
      if (PCSIZE - rowTrailing - 1 < trailingSize) trailingSize = PCSIZE - rowTrailing - 1;
    }

    // if shift is more than number of full columns that could be shifted
    if (fullShiftSize < -trailingSize || fullShiftSize > leadingSize) return false;
  }

  return true;
}

export function fumenMirror(fumen: Fumen): Fumen {
  const pages = decodeWrapper(fumen);

  for (const page of pages) {
    const fieldStr = page.field.str({ reduced: true, separator: '\n' }).split('\n');
    const newFieldStr: string[] = [];
    for (const line of fieldStr) {
      const reversedLine = line.split('').reverse().join('');
      let mirrorLine = '';
      for (const mino of reversedLine) {
        if (mino in mirrorPieces) mirrorLine += mirrorPieces[mino];
        else mirrorLine += mino;
      }
      newFieldStr.push(mirrorLine);
    }
    page.field = Field.create(
      newFieldStr.slice(0, -1).join(''),
      newFieldStr[newFieldStr.length - 1]
    );
  }

  return encoder.encode(pages) as Fumen;
}

export function fumenGetNumPages(fumen: Fumen): number {
  const pages = decodeWrapper(fumen);

  return pages.length;
}

// count from first page number of each piece
export function fumenCountPieces(fumen: Fumen): Record<string, number> {
  const pages = decodeWrapper(fumen);
  const field = pages[0].field;
  const height = getFieldHeight(field);

  // check if there's enough minos of each color to place pieces
  const frequencyCounter: Record<string, number> = {
    T: 0,
    I: 0,
    L: 0,
    J: 0,
    S: 0,
    Z: 0,
    O: 0
  };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < PCSIZE; x++) {
      const mino = field.at(x, y);
      if (isMinoPiece(mino)) {
        frequencyCounter[mino]++;
      }
    }
  }

  for (const piece in frequencyCounter) {
    frequencyCounter[piece] >>= 2;
  }

  return frequencyCounter;
}

// clear only lines specify in lines
export function fumenClearLines(fumen: Fumen, lines: number[]): Fumen {
  const pages = decodeWrapper(fumen);

  for (const page of pages) {
    const rows = page.field.str({ garbage: false }).split('\n');
    const height = rows.length;
    for (const line of lines) {
      rows.splice(height - 1 - line, 1);
    }
    page.field = Field.create(rows.join(''));
  }

  return encoder.encode(pages) as Fumen;
}
