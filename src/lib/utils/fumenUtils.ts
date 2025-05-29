import { decoder, type Field,  } from 'tetris-fumen';

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
