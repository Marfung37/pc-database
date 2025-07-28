import { decoder, encoder, Field, type Page, type Mino } from 'tetris-fumen';
import type { Fumen } from '$lib/types';

function getFieldHeight(field: Field): number {
  return field.str({ reduced: true, garbage: false }).split('\n').length;
}

export function is2Line(fumen: string): boolean {
  const pages = decoder.decode(fumen);

  for (let page of pages) {
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

  for (let page of pages) {
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

  for (let page of pages) {
    if (page.field !== null) {
      const pageHeight = getFieldHeight(page.field);
      if (height < pageHeight) height = pageHeight;
    }
  }

  return height;
}

function decodeWrapper(fumen: Fumen): Page[] {
  let pages: Page[];
  try {
    pages = decoder.decode(fumen);
  } catch (e) {
    throw new Error(`Fumen ${fumen} could not be decoded`);
  }

  return pages;
}

export function grayFumen(fumen: Fumen): string {
  // gray out all colored minos
  const pages = decodeWrapper(fumen);

  for (let page of pages) {
    if (page.field !== null) {
      page.field = Field.create(
        page.field
          .str({ reduced: true, garbage: false })
          .replaceAll(/[TILJSZO]/g, 'X')
          .replaceAll(/[\r\n]/g, '')
      );
    }
  }

  return encoder.encode(pages);
}

export function fumenGetComments(fumen: Fumen): string[] {
  const pages = decodeWrapper(fumen);
  const comments = [];

  for (let page of pages) comments.push(page.comment);

  return comments;
}

export function fumenCombine(fumens: Iterable<Fumen>): Fumen {
  const pages: Page[] = [];
  for (let fumen of fumens) pages.concat(decodeWrapper(fumen));

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

  for (let page of pages) {
    fumens.push(encoder.encode([page]) as Fumen);
  }

  return fumens;
}

export function fumenGetMinos(fumen: Fumen): Mino[] {
  const pages = decodeWrapper(fumen);
  const minos: Mino[] = [];

  for (let page of pages) {
    minos.push(page.mino());
  }

  return minos;
}
