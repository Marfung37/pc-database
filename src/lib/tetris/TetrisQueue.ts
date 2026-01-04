import type { Queue, Piece } from '$lib/types';
import { type PieceEnum, get_piece_number } from '$lib/tetris/pieceData';

// Tetris 7 bag queue generation
const BAGSIZE = 7;
export class TetrisQueue {
  // size in queue must mantain to have previews
  previewSize: number;
  queue: PieceEnum[];
  length: number;
  private pos: number;
  private fillBags: boolean;

  constructor(previewSize: number, fillBags: boolean = true) {
    this.previewSize = previewSize;
    this.fillBags = fillBags;
    this.queue = Array<number>(this.previewSize + BAGSIZE - 1);
    this.pos = 0;
    this.length = 0;

    this.reset();
  }

  reset(): void {
    this.pos = 0;
    this.length = 0;

    if(this.fillBags) {
      for (let i = 0; i < this.previewSize; i += BAGSIZE) {
        this.addBag();
      }
    }
  }

  private addBag(): void {
    let bag = Array.from({ length: BAGSIZE }, (_, i) => i + 1);
    for (let i = BAGSIZE - 1; i >= 0; i--) {
      const rand = Math.floor(Math.random() * (i + 1));
      this.queue[this.pos + this.length + BAGSIZE - 1 - i] = bag[rand];
      bag[rand] = bag[i];
    }
    this.length += BAGSIZE;
  }

  poll(): number {
    if (this.length == 0) {
      return 0;
    }

    this.length--;
    const oldPos = this.pos;
    this.pos = (this.pos + 1) % this.queue.length;

    if (this.fillBags && this.length < this.previewSize) {
      this.addBag();
    }

    return this.queue[oldPos];
  }

  preview(): PieceEnum[] {
    return Array.from({ length: Math.min(this.length, this.previewSize) }, (_, i) =>
      this.queue[(this.pos + i) % this.queue.length]
    );
  }

  // used to set the queue
  set(queue: Queue): void {
    this.length = queue.length;
    this.pos = 0;
    this.queue = ([...queue] as Piece[]).map(get_piece_number);
  }

  setFillBags(value: boolean): void {
    this.fillBags = value;
  }
}
