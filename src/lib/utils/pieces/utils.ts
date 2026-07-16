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
