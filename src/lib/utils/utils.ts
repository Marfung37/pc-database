export function indexBytea(data: string | null, index: number): boolean {
  if (data === null) return true;
  data = data.slice(2);
  const hexIndex = Math.floor(index / 4);
  const bitIndex = index % 4;

  return ((parseInt(data[hexIndex], 16) >> (3 - bitIndex)) & 1) == 1;
}
