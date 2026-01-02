import type { Queue, Piece } from '$lib/types';
import { get_piece_number } from '$lib/tetris/pieceData';

// Tetris 7 bag queue generation
const BAGSIZE = 7;
export class TetrisQueue {
  // size in queue must mantain to have previews
  previewSize: number;
  queue: number[];
  private pos: number;
  private size: number;
  private fillBags: boolean;

  constructor(previewSize: number, fillBags: boolean = true) {
    this.previewSize = previewSize;
    this.queue = Array<number>(previewSize + BAGSIZE - 1);
    this.pos = 0;
    this.size = 0;
    this.fillBags = fillBags;

    if(fillBags) {
      for (let i = 0; i < previewSize; i += BAGSIZE) {
        this.addBag();
      }
    }
  }

  private addBag(): void {
    let bag = Array.from({ length: BAGSIZE }, (_, i) => i + 1);
    for (let i = BAGSIZE - 1; i > 0; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      this.queue[this.pos + this.size + BAGSIZE - 1 - i] = bag[rand];
      bag[rand] = bag[i];
    }
    this.size += BAGSIZE;
  }

  poll(): number {
    this.size--;
    if (this.fillBags && this.size < this.previewSize) {
      this.addBag();
    }

    const oldPos = this.pos;
    this.pos = (this.pos + 1) % this.queue.length;
    return this.queue[oldPos];
  }

  preview() {
    return Array.from({ length: this.previewSize }, (_, i) =>
      this.queue[(this.pos + i) % this.queue.length]
    );
  }

  // used to set the queue
  set(queue: Queue) {
    this.queue = ([...queue] as Piece[]).map(get_piece_number);
  }

  setFillBags(value: boolean): void {
    this.fillBags = value;
  }
}
