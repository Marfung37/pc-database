import { extendPieces } from './pieces'; 
import { sortQueue, mirrorQueue } from './queueUtils';
import { BAG } from '$lib/constants';
import type { Queue } from '$lib/types';

// match with TILJSZO in string is isn't beginning of a word (lowercase afterwards)
const piecesRegex = new RegExp(`[${BAG}]+(?=[^a-z]|$)`, 'g')

/**
 * Determines if a queue is 'less than' another queue based on the specific TILJSZO order.
 * This function defines the sorting order for Tetris queues.
 *
 * @param q1 - A Tetris format queue string (e.g., "TISLZO").
 * @param q2 - Another Tetris format queue string.
 * @returns `true` if `q1` is considered less than `q2`, `false` otherwise.
 */
function compareQueues(q1: string, q2: string): boolean {
  // Assigns a numerical value to each Tetris piece type for comparison.
  const pieceVals: { [key: string]: number } = {
    T: 1,
    I: 2,
    L: 3,
    J: 4,
    S: 5,
    Z: 6,
    O: 7
  };

  // Determine the shorter length to avoid out-of-bounds access
  const minLength = Math.min(q1.length, q2.length);

  // Go through each piece from left to right, comparing them.
  for (let i = 0; i < minLength; i++) {
    const p1 = q1[i];
    const p2 = q2[i];

    // If piece in q1 is less than piece in q2, then q1 is smaller.
    if (pieceVals[p1] < pieceVals[p2]) {
      return true;
    }

    // If piece in q1 is greater than piece in q2, then q1 is larger.
    else if (pieceVals[p1] > pieceVals[p2]) {
      return false;
    }
    // Otherwise, the pieces are the same, continue to the next piece.
  }

  // If one queue is a prefix of the other (e.g., "TI" vs "TIL"),
  // the shorter queue is considered "less than" the longer one.
  return q1.length < q2.length;
}

/**
 * Performs a binary search to find a specific Tetris queue within a sorted list of queues.
 *
 * @param queue - The Tetris format queue string to search for.
 * @param queueList - A list of Tetris format queue strings, which MUST be sorted
 * according to the `compare` function (e.g., `compareQueues`).
 * @param compare - A functional object that determines if one queue is less than another.
 * Defaults to `compareQueues`.
 * @param equality - A functional object that determines if two queues are equal.
 * Defaults to strict string equality (`x === y`).
 * @returns The index where the `queue` was found in `queueList`, or -1 if not found.
 */
function binarySearch(
  queue: string,
  queueList: string[],
  compare: (q1: string, q2: string) => boolean = compareQueues,
  equality: (q1: string, q2: string) => boolean = (x, y) => x === y
): number {
  let low = 0;
  let high = queueList.length - 1;

  while (low <= high) {
    // Calculate the middle index using integer division.
    const mid = Math.floor(low + (high - low) / 2);

    // Check if the queue at the middle index is equal to the target queue.
    if (equality(queue, queueList[mid])) {
      return mid;
    }

    // If the target queue is less than the middle queue, search the left half.
    if (compare(queue, queueList[mid])) {
      high = mid - 1;
    }
    // Otherwise (target queue is greater than the middle queue), search the right half.
    else {
      low = mid + 1;
    }
  }

  // If the loop finishes, the queue was not found.
  return -1;
}

/**
 * Finds the index of a given Tetris queue within the generated "extended pieces" sequence.
 * This is effectively the contains in `extendPieces`,
 *
 * @param queue - A Tetris format queue string.
 * @param pattern - A pattern used to generate the extended pieces.
 * @param equality - An optional function to determine queue equality (defaults to strict string equality).
 * @returns The index where the queue was found in the extended pieces list.
 * @throws {ValueError} If any piece in the `queue` string is not a valid Tetris piece (T, I, L, J, S, Z, O).
 */
export function piecesContains(
  queue: string,
  pattern: string,
  equality: (x: string, y: string) => boolean = (x, y) => x === y
): number {
  // Define the set of valid Tetris pieces.
  const validPieces = new Set('TILJSZO');

  // Validate each character in the input queue.
  for (const piece of queue) {
    if (!validPieces.has(piece)) {
      throw new Error(`The piece '${piece}' is not a valid piece.`); // Using Error for consistency in TS
    }
  }

  const outQueues = extendPieces(pattern);

  // Perform a binary search on the generated queues.
  return binarySearch(queue, outQueues, compareQueues, equality);
}

export function piecesMirror(pattern: string): string {
  // replace all sequences of TILJSZO with mirror version
  return pattern.replace(piecesRegex, (match: string) => {
    return sortQueue(mirrorQueue(match as Queue));
  })
}
