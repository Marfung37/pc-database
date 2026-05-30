import type { Queue } from '$lib/types';
import { TetrisQueue } from '$lib/tetris/TetrisQueue';
import { TetrisBoard } from '$lib/tetris/TetrisBoard';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { PRNG, type Seed } from '$lib/tetris/random';
import type { Action } from '$lib/tetris/Keybind';
import { extendPieces, getPiecesLength } from '$lib/utils/pieces';
import { PCSIZE, BOARDHEIGHT } from '$lib/constants';
import { get_kicks, spin_cw, spin_ccw, spin_180, PieceEnum, Rotation } from '$lib/tetris/pieceData';

const PREVIEWSIZE = 5;
const INITIALY = 19;
const INITIALX = 4;

export const DEFAULT = {
  arr: 0,
  sdArr: 0,
  das: 80
};

type MovementAction = Extract<Action, 'left' | 'right' | 'sd'>;

export type Event = string;
export type Mode = string | 'pure' | 'practice';

export class TetrisGame {
  board: TetrisBoard;
  queue: TetrisQueue;
  holdPiece!: PieceEnum;
  active!: TetrisBoardPiece;

  softReset: boolean = false;

  handling: Record<string, number>;
  storageKey: string;

  pieceCount: number;
  totalPieceCount: number;

  pendingEvents: Event[]; // bridge to frontend

  protected random: PRNG;
  protected seed: Seed;

  protected simulating: boolean;

  protected mode: string | 'pure' | 'practice';
  protected held!: boolean;
  private timers!: Record<MovementAction, number>;

  protected queues: Array<string>;
  protected queueIndex: number;
  protected operations: TetrisBoardPiece[];

  constructor(
    pattern: string = '',
    handling: Record<string, number> = DEFAULT,
    storageKey: string = 'handling'
  ) {
    this.handling = handling;
    this.storageKey = storageKey;
    this.mode = 'pure';
    this.pieceCount = 0;
    this.totalPieceCount = 0;

    this.pendingEvents = [];

    this.random = new PRNG();
    this.seed = this.random.reseed();

    this.simulating = false;

    this.queue = new TetrisQueue(PREVIEWSIZE, this.random);
    this.board = new TetrisBoard(PCSIZE, BOARDHEIGHT + 1);
    this.queues = [];
    this.queueIndex = -1;
    this.operations = [];

    this.setPattern(pattern);
  }

  setPractice(pattern: string): void {
    if (pattern === '') this.mode = 'pure';
    else this.mode = 'practice';
    this.setPattern(pattern);
  }

  protected setPattern(pattern: string): void {
    if (pattern.length > 0) {
      if (getPiecesLength(pattern) > PCSIZE + 1) {
        throw new Error(`Pattern produced a queue longer than ${PCSIZE + 1}`);
      }
      this.queues = extendPieces(pattern, false);
      if (this.queues.length > 0) {
        this.queue.setFillBags(false);
      }
    }
    this.fullReset();
  }

  protected setActive(piece: PieceEnum): void {
    if (piece == PieceEnum.X) throw new Error('Unable to set active piece as gotten invalid piece');
    this.active = new TetrisBoardPiece(INITIALX, INITIALY, piece, Rotation.spawn);
  }

  fullReset(): void {
    this.seed = this.random.reseed();
    this.operations = [];
    this.totalPieceCount = 0;
    this.reset();
  }

  reset(soft: boolean = false): void {
    this.held = false;
    this.holdPiece = 0;
    this.timers = {
      left: -1,
      right: -1,
      sd: -1
    };

    this.queue.reset();
    this.board.reset();
    this.pieceCount = 0;

    // soft by keeping the queue
    if (this.queues.length > 0) {
      if (soft) this.queue.set(this.queues[this.queueIndex] as Queue);
      else {
        this.regen();
      }
    }

    if (this.queues.length > 0 && this.queue.previewSize > 1) {
      this.holdPiece = this.queue.poll();
    }

    this.setActive(this.queue.poll());
  }

  regen(): void {
    this.queueIndex = Math.floor(this.random.random() * this.queues.length);
    this.queue.set(this.queues[this.queueIndex] as Queue);
  }

  checkCollide(piece: TetrisBoardPiece): boolean {
    for (const pos of piece.getMinos()) {
      if (pos.x < 0 || pos.x >= PCSIZE || pos.y < 0 || this.board.isFilled(pos.y, pos.x)) {
        return true;
      }
    }
    return false;
  }

  getGhost(): TetrisBoardPiece {
    const ghost = this.active.copy();
    do ghost.move(0, -1);
    while (!this.checkCollide(ghost));
    ghost.move(0, 1);
    return ghost;
  }

  hold(): void {
    if (this.held) {
      return;
    }
    this.held = this.mode === 'pure';
    if (this.holdPiece === PieceEnum.X) {
      if (this.queue.length == 0) {
        this.setActive(this.active.type);
        return;
      }
      this.holdPiece = this.active.type;
      this.setActive(this.queue.poll());
      return;
    }

    const tmp = this.active.type;
    this.setActive(this.holdPiece);
    this.holdPiece = tmp;
  }

  protected movePiece(dx: number, dy: number): boolean {
    // move piece directly to location and checks if collides there

    this.active.move(dx, dy);
    // didn't collide at that location
    if (!this.checkCollide(this.active)) {
      return true;
    }
    // reverse action
    this.active.move(-dx, -dy);
    return false;
  }

  spin(rotation: Rotation): void {
    const init = this.active.rotation;
    this.active.rotation = rotation;

    for (const [dx, dy] of get_kicks(this.active.type, init, rotation)) {
      if (this.movePiece(dx, dy)) return;
    }
    this.active.rotation = init;
  }

  spinCW(): void {
    this.spin(spin_cw(this.active.rotation));
  }

  spinCCW(): void {
    this.spin(spin_ccw(this.active.rotation));
  }

  spin180(): void {
    this.spin(spin_180(this.active.rotation));
  }

  down(): void {
    this.movePiece(0, -1);
  }

  lock(piece: TetrisBoardPiece | null = null): void {
    // move piece as far down as possible (hd)
    if (piece !== null) {
      this.active.x = piece.x;
      this.active.y = piece.y;
      this.active.rotation = piece.rotation;
      if (this.active.type !== piece.type) {
        // DEBUG
        console.error('Incorrect piece passed to be locked');
      }
    } else {
      while (this.movePiece(0, -1));
      this.held = false;
      this.operations.push(this.active.copy());
    }
    this.board.place(this.active, true);
    this.pieceCount++;
    this.totalPieceCount++;

    if (this.queue.length == 0) {
      if (this.holdPiece != PieceEnum.X) {
        this.setActive(this.holdPiece);
        this.holdPiece = PieceEnum.X;
      } else if (this.mode === 'practice') {
        // no more pieces
        this.reset(this.softReset);
      }
    } else {
      this.setActive(this.queue.poll());
    }

    // practice pc
    if (this.mode === 'practice' && this.board.isEmpty()) {
      this.reset(this.softReset);
    }

    // topped out
    if (this.checkCollide(this.active)) {
      this.reset(this.softReset);
    }
  }

  undo(): void {
    this.random.seed(this.seed);
    if (this.mode === 'pure' || this.operations.length == 0) return;

    // remove last piece placed
    this.operations.pop();

    const queueLength = this.queues[0].length;
    if ((this.operations.length + 1) % queueLength == 0) {
      this.queue.reset();
      this.holdPiece = PieceEnum.X;
    } else if (this.holdPiece == PieceEnum.X) {
      this.holdPiece = this.active.type;
    } else {
      this.queue.enqueue(this.active.type);
    }

    // run all the operations and simulate with the current board state should be now
    this.reset();
    this.simulating = true;
    this.totalPieceCount = 0;
    for (const piece of this.operations) {
      if (this.active.type !== piece.type) {
        if (this.holdPiece !== piece.type) {
          console.error('Wrong piece from hold also');
        }
        this.hold();
      }
      this.lock(piece);
    }
    this.simulating = false;
  }

  tick(time: number, actions: Set<Action>) {
    const buf = {
      left: false,
      right: false,
      sd: false
    };
    for (const action of actions) {
      switch (action) {
        case 'hold':
          this.hold();
          break;
        case 'undo':
          this.undo();
          break;
        case 'ccw':
          this.spinCCW();
          break;
        case 'cw':
          this.spinCW();
          break;
        case '180':
          this.spin180();
          break;
        case 'hd':
          this.lock();
          break;
        case 'd1':
          this.down();
          break;
        case 'reset':
          this.fullReset();
          break;
        case 'left':
        case 'right':
        case 'sd':
          buf[action] = true;
          break;
      }
    }
    let ldas = -1;
    let rdas = -1;

    if (!buf['left']) {
      this.timers['left'] = -1;
    } else if (
      this.timers['left'] != -1 &&
      time - this.timers['left'] >= this.handling.das + this.handling.arr
    ) {
      ldas = this.timers['left'] + this.handling.das;
    }

    if (!buf['right']) {
      this.timers['right'] = -1;
    } else if (
      this.timers['right'] != -1 &&
      time - this.timers['right'] >= this.handling.das + this.handling.arr
    ) {
      rdas = this.timers['right'] + this.handling.das;
    }

    // replace with arr later
    if (
      !(buf['left'] && buf['right'] && (ldas == -1 || rdas == -1)) &&
      ldas != -1 &&
      (rdas == -1 || ldas > rdas)
    ) {
      while (ldas + this.handling.arr < time) {
        if (!this.movePiece(-1, 0)) {
          ldas = time;
          break;
        }
        ldas += this.handling.arr;
        if (buf['sd']) {
          if (this.timers['sd'] == -1) {
            this.timers['sd'] = time;
          }
          let sddas = this.timers['sd'];
          while (sddas <= time) {
            if (!this.movePiece(0, -1)) {
              sddas = time;
              break;
            }
            sddas += this.handling.sdArr;
          }
          this.timers['sd'] = sddas;
        }
      }
      this.timers['left'] = ldas - this.handling.das;
      if (this.timers['right'] != -1) {
        this.timers['right'] = ldas - 1;
      }
    } else if (rdas != -1) {
      while (rdas + this.handling.arr < time) {
        if (!this.movePiece(1, 0)) {
          rdas = time - this.handling.das;
          break;
        }
        rdas += this.handling.arr;
        if (buf['sd']) {
          if (this.timers['sd'] == -1) {
            this.timers['sd'] = time;
          }
          let sddas = this.timers['sd'];
          while (sddas <= time) {
            if (!this.movePiece(0, -1)) {
              sddas = time;
              break;
            }
            sddas += this.handling.sdArr;
          }
          this.timers['sd'] = sddas;
        }
      }
      this.timers['right'] = rdas - this.handling.das;
      if (this.timers['left'] != -1) {
        this.timers['left'] = rdas - 1;
      }
    }
    if (buf['left'] && this.timers['left'] == -1) {
      this.movePiece(-1, 0);
      this.timers['left'] = time;
    }
    if (buf['right'] && this.timers['right'] == -1) {
      this.movePiece(1, 0);
      this.timers['right'] = time;
    }

    if (buf['sd']) {
      if (this.timers['sd'] == -1) {
        this.timers['sd'] = time;
      }
      let sddas = this.timers['sd'];
      while (sddas <= time) {
        if (!this.movePiece(0, -1)) {
          sddas = time;
          break;
        }
        sddas += this.handling.sdArr;
      }
      this.timers['sd'] = sddas;
    } else {
      this.timers['sd'] = -1;
    }
  }

  saveHandling() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.handling));
  }

  loadHandling(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      this.handling = JSON.parse(raw);
    } catch (e) {
      console.error(e);
    }
  }
}
