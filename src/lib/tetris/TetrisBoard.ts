import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { get_piece_name } from '$lib/tetris/pieceData';

export class TetrisBoard {
  public width: number;
  public height: number;
  private board: number[][] = new Array<number[]>();

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;

    // initialize board with all 0
    this.reset();
  }

  /**
    * Check if given row is full
    */
  lineFull(row: number): boolean {
    if (row < 0 || row >= this.height) {
      throw new RangeError(`Given row out of bounds of 0-${this.height}`)
    }

    return this.board[row].every((cell) => cell != 0)
  }

  /**
    * Clears a row, doesn't check if filled
    */
  lineclear(row: number): void {
    if (row < 0 || row >= this.height) {
      throw new RangeError(`Given row out of bounds of 0-${this.height}`)
    }

    this.board[0] = new Array(this.width).fill(0);
    row = Math.min(row, this.height);
    for (let i = row - 1; i > 0; i--) {
      this.board[i] = this.board[i - 1];
    }
  }

  at(row: number, col: number): number {
    if (row < 0 || row >= this.height) {
      throw new RangeError(`Given row out of bounds of 0-${this.height}`)
    }
    if (col < 0 || col >= this.width) {
      throw new RangeError(`Given col out of bounds of 0-${this.width}`)
    }

    return this.board[row][col];
  }

  isFilled(row: number, col: number): boolean {
    return this.at(row, col) !== 0;
  }

  place(piece: TetrisBoardPiece) {
    for(let {x, y} of piece.getMinos()) {
      this.board[y][x] = piece.type;
    }
  }

  isEmpty(): boolean {
    return this.board.flat().reduce((sum, c) => sum + c, 0) == 0;
  }

  reset(): void {
    this.board = Array.from({ length: this.height }, () => new Array(this.width).fill(0));
  }

  toString(): string {
    return this.board.map((row) => row.map(get_piece_name).join('')).join('\n');
  }
}
