import { type GeneratorLiteral, tetrisCompare } from './defines';

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

// based on https://github.com/N8Brooks/combinatorics/blob/main/permutations.ts for specifically tetris queues
// pool must be at most 32 in length and sorted
export function* permutations(pool: string, r?: number): Generator<string> {
  const n = pool.length;
  r = r === undefined ? n : r;

  if (r > n) return;

  const cycles = Array(r)
    .fill(0)
    .map((_, index) => n - index);
  const indices = new Uint8Array(n).map((_, index) => index);

  // check if permutation isn't a duplicate
  const isValidPermutation = (limit: number): string | null => {
    let usedMask = 0;
    let result = '';

    for (let k = 0; k < limit; k++) {
      const originalIndex = indices[k];
      const pieceType = pool[originalIndex];

      // check if first available instance of the duplicate piece was used
      // because the pool is sorted, identical pieces are contiguous.
      let prevIdx = originalIndex - 1;
      while (prevIdx >= 0 && pool[prevIdx] === pieceType) {
        const isPrevUsed = (usedMask & (1 << prevIdx)) !== 0;
        if (!isPrevUsed) {
          return null;
        }
        prevIdx--;
      }

      usedMask |= 1 << originalIndex;
      result += pieceType;
    }
    return result;
  };

  yield pool.slice(0, r);

  while (true) {
    loop: {
      for (let i = r - 1; i >= 0; i--) {
        cycles[i] -= 1;
        if (cycles[i] === 0) {
          let index = indices[i];
          for (let j = n - 1; j >= i; j--) {
            const temp = index;
            index = indices[j];
            indices[j] = temp;
          }
          cycles[i] = n - i;
        } else {
          const j = n - cycles[i];
          const temp = indices[i];
          indices[i] = indices[j];
          indices[j] = temp;

          const result = isValidPermutation(r);
          if (result !== null) yield result;
          break loop;
        }
      }
      return;
    }
  }
}

interface HeapNode {
  value: string; // The permutation string
  generatorIndex: number; // Which permutation generator it came from
}

class MinHeap {
  private data: HeapNode[] = [];

  push(node: HeapNode) {
    this.data.push(node);
    this.up(this.data.length - 1);
  }

  pop(): HeapNode | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop();
    if (this.data.length > 0 && bottom !== undefined) {
      this.data[0] = bottom;
      this.down(0);
    }
    return top;
  }

  size(): number {
    return this.data.length;
  }

  private up(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (tetrisCompare(this.data[i].value, this.data[p].value) > 0) break;
      this.swap(i, p);
      i = p;
    }
  }

  private down(i: number) {
    const len = this.data.length;
    while ((i << 1) + 1 < len) {
      const left = (i << 1) + 1;
      const right = left + 1;
      let best = left;
      if (right < len && this.data[right].value < this.data[left].value) {
        best = right;
      }
      if (this.data[i].value <= this.data[best].value) break;
      this.swap(i, best);
      i = best;
    }
  }

  private swap(i: number, j: number) {
    const temp = this.data[i];
    this.data[i] = this.data[j];
    this.data[j] = temp;
  }
}

/**
 * Merges K pre-sorted string arrays into a single, uniquely sorted string array.
 * Time Complexity: O(N log K) where N is total elements, K is number of arrays.
 * Space Complexity: O(K) auxiliary space.
 */
export function mergeSortedUniquePermutations(generators: Generator<string>[]): string[] {
  const heap = new MinHeap();
  const result: string[] = [];

  // 1. Initialize the heap with the first element of each sorted array
  for (let i = 0; i < generators.length; i++) {
    const element = generators[i].next();
    if (!element.done) {
      heap.push({
        value: element.value,
        generatorIndex: i
      });
    }
  }

  // 2. Extract min, add to result if unique, and pull the next element from that array
  while (heap.size() > 0) {
    const minNode = heap.pop()!;

    // Deduplication step: only push if it's different from the last pushed value
    if (result.length === 0 || result[result.length - 1] !== minNode.value) {
      result.push(minNode.value);
    }

    const parentGenerator = generators[minNode.generatorIndex];
    const element = parentGenerator.next();

    // If the array we just pulled from has more elements, push the next one to the heap
    if (!element.done) {
      heap.push({
        value: element.value,
        generatorIndex: minNode.generatorIndex
      });
    }
  }

  return result;
}

export function evaluateGenerator(node: GeneratorLiteral): string[] {
  const pools = product(node.pool);

  const rawPermutations: Generator<string>[] = [];
  for (let pool of pools) {
    // sort the pool
    pool = [...pool].sort(tetrisCompare).join('');

    rawPermutations.push(permutations(pool, node.permute));
  }

  if (rawPermutations.length == 1) return [...rawPermutations[0]];

  return mergeSortedUniquePermutations(rawPermutations);
}
