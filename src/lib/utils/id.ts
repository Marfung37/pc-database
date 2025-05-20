function hashFumen(fumen: string, bits: number = 4): number {
  const randomSection = fumen.slice(5, -8); // section of fumen that is reasonably random
  let xor = 0;

  for (let i = 0; i < randomSection.length; i++) {
    xor ^= randomSection.charCodeAt(i);
  }

  return xor & ((1 << bits) - 1);
}
