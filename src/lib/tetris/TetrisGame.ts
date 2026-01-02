import type { Queue } from '$lib/types';
import { TetrisQueue } from '$lib/tetris/TetrisQueue';
import { TetrisBoard } from '$lib/tetris/TetrisBoard';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { extendPieces } from '$lib/utils/pieces';
import { PCSIZE, BOARDHEIGHT } from '$lib/constants';

const PREVIEWSIZE = 5;

class TetrisGame {
  private arr: number;
  private sdArr: number;
  private das: number;
  private isPrac: boolean;
  private queue: TetrisQueue;
  private board: TetrisBoard;

  constructor(pattern: string = '') {
    this.arr = 0;
    this.sdArr = 0;
    this.das = 69;
    this.isPrac = false;

    this.queue = new TetrisQueue(PREVIEWSIZE);
    this.board = new TetrisBoard(PCSIZE, BOARDHEIGHT);
    if (pattern.length > 0) {
      const queues = extendPieces(pattern);
      if (queues.length > 0) {
        // chose random from queues
        const index = Math.floor(Math.random() * queues.length);
        this.queue.set(queues[index] as Queue);
        this.queue.setFillBags(false);
        this.isPrac = true;
      }
    }
  }

  checkCollide(piece: TetrisBoardPiece) {

  }
}
