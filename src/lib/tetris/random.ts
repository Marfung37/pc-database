// seedable PRNG
export function sfc32(a: number, b: number, c: number, d: number) {
  return function() {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = (c << 21 | c >>> 11);
    c = c + t | 0;
    // (t >>> 0) converts to unsigned 32-bit, then normalizes to [0, 1)
    return (t >>> 0) / 4294967296; 
  }
}

export type Seed = [number, number, number, number];
const seedGenerator = () => (Math.random() * 2**32) >>> 0;

export class PRNG {
  private sfc32Rand: () => number;

  constructor() {
    this.sfc32Rand = sfc32(...this.genSeed());
  }

  private genSeed(): Seed {
    return [seedGenerator(), seedGenerator(), seedGenerator(), seedGenerator()];
  }

  seed(seed: Seed): void {
    this.sfc32Rand = sfc32(...seed);
  }

  reseed(): Seed {
    const seed = this.genSeed();
    this.seed(seed);
    return seed;
  }

  random(): number {
    console.log("Random called");
    return this.sfc32Rand();
  }
}
