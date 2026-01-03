import { get_offsets, get_colour, PieceEnum, Rotation } from '$lib/tetris/pieceData';

interface Pos {
  x: number;
  y: number;
}

export class TetrisBoardPiece {
  x: number;
  y: number;
  type: PieceEnum;
  rotation: Rotation;

  constructor(x: number, y: number, type: PieceEnum, rotation: Rotation) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.rotation = rotation;
  }

  getMinos(): Pos[] {
    return get_offsets(this.type, this.rotation).map(([dx, dy]) => ({x: this.x + dx, y: this.y + dy}));
  }

  getColor(): string {
    return get_colour(this.type);
  }

  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  copy(): TetrisBoardPiece {
    return new TetrisBoardPiece(this.x, this.y, this.type, this.rotation);
  }
}
