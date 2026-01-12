import type { Queue } from '$lib/types';
import { TetrisQueue } from '$lib/tetris/TetrisQueue';
import { TetrisBoard } from '$lib/tetris/TetrisBoard';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import type { Action } from '$lib/tetris/Keybind';
import { extendPieces, getPiecesLength } from '$lib/utils/pieces';
import { PCSIZE, BOARDHEIGHT } from '$lib/constants';
import { get_kicks, spin_cw, spin_ccw, spin_180, PieceEnum, Rotation } from '$lib/tetris/pieceData';

const PREVIEWSIZE = 5;
const INITIALY = 19;
const INITIALX = 4;

const DEFAULT = {
  arr: 0,
  sdArr: 0,
  das: 80
};

export class TetrisGame {
  board: TetrisBoard;
  queue: TetrisQueue;
  holdPiece!: PieceEnum;
  active!: TetrisBoardPiece;

  softReset: boolean = false;

  handling: Record<string, number>;
  storageKey: string;

  private isPrac: boolean;
  private held!: boolean;
  private timers!: Record<Action, number>;

  private queues: Array<string>;
  private queueIndex: number;
  private operations: TetrisBoardPiece[];

  constructor(
    pattern: string = '',
    handling: Record<string, number> = DEFAULT,
    storageKey: string = 'handling'
  ) {
    this.handling = handling;
    this.storageKey = storageKey;
    this.isPrac = false;

    this.queue = new TetrisQueue(PREVIEWSIZE);
    this.board = new TetrisBoard(PCSIZE, BOARDHEIGHT + 1);
    this.queues = [];
    this.queueIndex = -1;
    this.operations = [];

    if (pattern.length > 0) {
      if (getPiecesLength(pattern) > PCSIZE + 1) {
        throw new Error(`Pattern produced a queue longer than ${PCSIZE + 1}`);
      }
      this.queues = extendPieces(pattern, false);
      if (this.queues.length > 0) {
        this.queue.setFillBags(false);
        this.isPrac = true;
        this.regen();
      }
    }

    this.reset(this.softReset);
  }

  private setActive(piece: PieceEnum): void {
    if (piece == PieceEnum.X) throw new Error('Unable to set active piece as gotten invalid piece');
    this.active = new TetrisBoardPiece(INITIALX, INITIALY, piece, Rotation.spawn);
  }

  reset(soft: boolean = false): void {
    this.held = false;
    this.holdPiece = 0;
    this.operations = [];
    this.timers = {
      left: -1,
      right: -1,
      sd: -1
    };

    this.queue.reset();
    this.board.reset();

    // soft by keeping the queue
    if (this.queues.length > 0) {
      if (soft) this.queue.set(this.queues[this.queueIndex] as Queue);
      else this.regen();
    }

    if (this.queues.length > 0 && this.queue.previewSize > 1) {
      this.holdPiece = this.queue.poll();
    }

    this.setActive(this.queue.poll());
  }

  regen(): void {
    this.queueIndex = Math.floor(Math.random() * this.queues.length);
    this.queue.set(this.queues[this.queueIndex] as Queue);
  }

  checkCollide(piece: TetrisBoardPiece): boolean {
    for (let pos of piece.getMinos()) {
      if (pos.x < 0 || pos.x >= PCSIZE || pos.y < 0 || this.board.isFilled(pos.y, pos.x)) {
        return true;
      }
    }
    return false;
  }

  getGhost(): TetrisBoardPiece {
    let ghost = this.active.copy();
    do ghost.move(0, -1);
    while (!this.checkCollide(ghost));
    ghost.move(0, 1);
    return ghost;
  }

  hold(): void {
    if (this.held) {
      return;
    }
    this.held = !this.isPrac;
    if (this.holdPiece === PieceEnum.X) {
      if (this.queue.length == 0) {
        this.setActive(this.active.type);
        return;
      }
      this.holdPiece = this.active.type;
      this.setActive(this.queue.poll());
      return;
    }

    let tmp = this.active.type;
    this.setActive(this.holdPiece);
    this.holdPiece = tmp;
  }

  private movePiece(dx: number, dy: number): boolean {
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
    for (let [dx, dy] of get_kicks(this.active.type, init, rotation)) {
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

  lock(): void {
    // move piece as far down as possible (hd)
    while (this.movePiece(0, -1));
    this.held = false;
    this.operations.push(this.active.copy());
    this.board.place(this.active, true);

    if (this.queue.length == 0) {
      if (this.holdPiece != PieceEnum.X) {
        this.setActive(this.holdPiece);
        this.holdPiece = PieceEnum.X;
      } else {
        // no more pieces
        this.reset(this.softReset);
      }
    } else {
      this.setActive(this.queue.poll());
    }

    // practice pc
    if (this.isPrac && this.board.isEmpty()) {
      this.regen();
      this.reset(this.softReset);
    }

    // topped out
    if (this.checkCollide(this.active)) {
      this.reset(this.softReset);
    }
  }

  undo(): void {
    if (this.operations.length == 0) return;

    let piece = this.operations.pop() as TetrisBoardPiece;
    this.queue.enqueue(this.active.type);
    this.setActive(piece.type);
    this.board.clearPiece(piece);
  }

  tick(time: number, actions: Set<Action>) {
    let buf = {
      left: false,
      right: false,
      sd: false
    };
    for (let action of actions) {
      switch (action) {
        case 'hold':
          this.hold();
          actions.delete('hold');
          break;
        case 'undo':
          this.undo();
          actions.delete('undo');
          break;
        case 'ccw':
          this.spinCCW();
          actions.delete('ccw');
          break;
        case 'cw':
          this.spinCW();
          actions.delete('cw');
          break;
        case '180':
          this.spin180();
          actions.delete('180');
          break;
        case 'hd':
          this.lock();
          actions.delete('hd');
          break;
        case 'd1':
          this.down();
          actions.delete('d1');
          break;
        case 'reset':
          this.reset();
          actions.delete('reset');
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
    if (buf['left'] && buf['right'] && (ldas == -1 || rdas == -1)) {
    } else if (ldas != -1 && (rdas == -1 || ldas > rdas)) {
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
