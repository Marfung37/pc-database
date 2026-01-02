import { get_offsets, get_colour } from '$lib/tetris/pieceData';

interface Pos {
  x: number;
  y: number;
}

export class TetrisBoardPiece {
  x: number;
  y: number;
  type: number;
  rotation: number;

  constructor(x: number, y: number, type: number, rotation: number) {
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

  move(dx: number, dy: number) {
    this.x += dx;
    this.y += dy;
  }
}
