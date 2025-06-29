import { decoder, encoder, Field, type Page } from 'tetris-fumen';

function getFieldHeight(field: Field): number {
  return field.str({ reduced: true, garbage: false }).split('\n').length;
}

export function is2Line(fumen: string): boolean {
  const pages = decoder.decode(fumen)

  for(let page of pages) {
    if (page.field !== null) {
      const lines = page.field.str({ reduced: true, garbage: false }).split('\n');

      if(lines.length != 2 || lines.some((x) => x.includes('_'))) {
        return false;
      }
    }
  } 

  return true;
}

export function isPC(fumen: string): boolean {
  const pages = decoder.decode(fumen)

  for(let page of pages) {
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
  const pages = decoder.decode(fumen)
  let height = 0

  for(let page of pages) {
    if (page.field !== null) {
      const pageHeight = getFieldHeight(page.field);
      if (height < pageHeight)
        height = pageHeight;
    }
  }

  return height;
}

function decodeWrapper(fumen: string): Page[] {
  let pages: Page[];
  try {
    pages = decoder.decode(fumen)
  } catch (e) {
    throw new Error(`Fumen ${fumen} could not be decoded`)
  }

  return pages
}

export function grayFumen(fumen: string): string {
  // gray out all colored minos
  const pages = decodeWrapper(fumen);

  for(let page of pages) {
    if (page.field !== null) {
      page.field = Field.create(page.field.str({ reduced: true, garbage: false }).replaceAll(/[TILJSZO]/g, 'X').replaceAll(/[\r\n]/g, ''));
    }
  }

  return encoder.encode(pages);
}

export function fumenGetComments(fumen: string): string[] {
  const pages = decodeWrapper(fumen);
  const comments = [];

  for (let page of pages) 
    comments.push(page.comment)

  return comments;
}
