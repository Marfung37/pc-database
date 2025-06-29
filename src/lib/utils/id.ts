const setupidRegex = new RegExp('^[1-9][0-9a-f]{11}$');

export function isSetupID(s: string): boolean {
  return setupidRegex.test(s);
}

export function hashFumen(fumen: string, bits: number = 4): number {
  const randomSection = fumen.slice(5, -8); // section of fumen that is reasonably random
  let xor = randomSection.length;

  for (let i = 0; i < randomSection.length; i++) {
    xor = ((xor << 3) | (xor >> 4)) & 0x7f;
    xor ^= randomSection.charCodeAt(i);
  }

  return xor & ((1 << bits) - 1);
}

export function hashCoverDependence(coverDependence: string, bits: number = 2): number {
  let xor = coverDependence.length;

  for (let i = 0; i < coverDependence.length; i++) {
    xor ^= coverDependence.charCodeAt(i);
  }

  return xor & ((1 << bits) - 1);
}
