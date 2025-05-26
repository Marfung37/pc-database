import type { Queue } from '$lib/types';
import { BAG, PIECEVAL } from '$lib/constants';

const queueRegex = new RegExp(`^[${BAG}]+$`);

export function isQueue(s: string): boolean {
  return queueRegex.test(s);
}

export function sortQueue(queue: Queue): Queue {
  const pieces = queue.split('');

  pieces.sort((a, b) => PIECEVAL[a] - PIECEVAL[b]);

  return pieces.join('') as Queue;
}
