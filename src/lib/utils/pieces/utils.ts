const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor;

// based on https://github.com/ehmicky/fast-cartesian/blob/main/src/main.ts for strings
type ProductInputs = string | string[];
type LoopFunction = (arrays: ProductInputs[]) => Generator<ProductInputs>;
const cache: { [key: number]: LoopFunction } = {};

const getLoopFunc = (length: number) => {
  return cache[length] ?? (cache[length] = mGetLoopFunc(length));
};

const mGetLoopFunc = (length: number) => {
  const indexes = Array.from({ length }, (_, i) => String(i));
  const start = indexes
    .map((index) => `for (const value${index} of arrays[${index}]) {`)
    .join('\n');
  const middle = indexes.map((index) => `value${index}`).join('+');
  const end = '}\n'.repeat(length);

  return new GeneratorFunction('arrays', `${start}\nyield ${middle}\n${end}`) as LoopFunction;
};

export function* product(iterables: ProductInputs[]): Generator<ProductInputs> {
  const loopFunc = getLoopFunc(iterables.length);
  yield* loopFunc(iterables);
}

// factorials to be use in the computations of comb and perm
const factorials = Array.from({ length: 8 }, (_, i) => i);
factorials[0] = 1;
for (let i = 1; i < 8; i++) {
  factorials[i] *= factorials[i - 1];
}

export function comb(n: number, k: number): number {
  return factorials[n] / (factorials[k] * factorials[n - k]);
}

export function perm(n: number, k?: number): number {
  if (k === undefined) k = n;
  if (n <= 7) return factorials[n] / factorials[n - k];

  let result = n;
  for (let i = n - 1; i > k; i--) {
    result *= i;
  }
  return result;
}
