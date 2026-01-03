import type { Piece } from '$lib/types';

// gotten from https://github.com/MonkieeBoi/pc/blob/main/js/tables.js
const offsets: number[][][][] = [
  [],
  // T
  [
    [[0, 1], [-1, 0], [0, 0], [1, 0]],
    //   []
    // []<>[]
    [[0, 1], [0, 0], [1, 0], [0, -1]],
    // []
    // <>[]
    // []
    [[-1, 0], [0, 0], [1, 0], [0, -1]],
    // []<>[]
    //   []
    [[0, 1], [-1, 0], [0, 0], [0, -1]],
    //   []
    // []<>
    //   []
  ],
  // I
  [
    [[-1, 0], [0, 0], [1, 0], [2, 0]],
    // []<>[][]
    [[0, 1], [0, 0], [0, -1], [0, -2]],
    // []
    // <>
    // []
    // []
    [[-2, 0], [-1, 0], [0, 0], [1, 0]],
    // [][]<>[]
    [[0, 2], [0, 1], [0, 0], [0, -1]],
    // []
    // []
    // <>
    // []
  ],
  // L
  [
    [[1, 1], [-1, 0], [0, 0], [1, 0]],
    //   []
    // []<>[]
    [[0, 1], [0, 0], [0, -1], [1, -1]],
    // []
    // <>
    // [][]
    [[-1, 0], [0, 0], [1, 0], [-1, -1]],
    // []<>[]
    // []
    [[-1, 1], [0, 1], [0, 0], [0, -1]],
    // [][]
    //   <>
    //   []
  ],
  // J
  [
    [[-1, 1], [-1, 0], [0, 0], [1, 0]],
    // []
    // []<>[]
    [[0, 1], [1, 1], [0, 0], [0, -1]],
    // [][]
    // <>
    // []
    [[-1, 0], [0, 0], [1, 0], [1, -1]],
    // []<>[]
    //   []
    [[0, 1], [0, 0], [-1, -1], [0, -1]],
    //   []
    //   <>
    // [][]
  ],
  // S
  [
    [[0, 1], [1, 1], [-1, 0], [0, 0]],
    //   [][]
    // []<>
    [[0, 1], [0, 0], [1, 0], [1, -1]],
    // []
    // <>[]
    //   []
    [[0, 0], [1, 0], [-1, -1], [0, -1]],
    //   <>[]
    // [][]
    [[-1, 1], [-1, 0], [0, 0], [0, -1]],
    // []
    // []<>
    //   []
  ],
  // Z
  [
    [[-1, 1], [0, 1], [0, 0], [1, 0]],
    // [][]
    //   <>[]
    [[1, 1], [0, 0], [1, 0], [0, -1]],
    //   []
    // <>[]
    // []
    [[-1, 0], [0, 0], [0, -1], [1, -1]],
    // []<>
    //   [][]
    [[0, 1], [-1, 0], [0, 0], [-1, -1]],
    //   []
    // []<>
    // []
  ],
  // O
  [
    [[0, 1], [1, 1], [0, 0], [1, 0]],
    // [][]
    // <>[]
    [[0, 0], [1, 0], [0, -1], [1, -1]],
    // <>[]
    // [][]
    [[-1, 0], [0, 0], [-1, -1], [0, -1]],
    // []<>
    // [][]
    [[-1, 1], [0, 1], [-1, 0], [0, 0]],
    // [][]
    // []<>
  ],
];

const kick_offset_2x3: number[][][] = [
  // Spawn
  [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  // CW
  [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  // 180
  [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]],
  // CCW
  [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
];

const kick_offset_1x4: number[][][] = [
  // Spawn
  [[0, 0], [-1, 0], [2, 0], [-1, 0], [2, 0]],
  // CW
  [[-1, 0], [0, 0], [0, 0], [0, 1], [0, -2]],
  // 180
  [[-1, 1], [1, 1], [-2, 1], [1, 0], [-2, 0]],
  // CCW
  [[0, 1], [0, 1], [0, 1], [0, -1], [0, 2]],
];

const kick_offset_2x2: number[][][] = [
  // Spawn
  [[0, 0]],
  // CW
  [[0, -1]],
  // 180
  [[-1, -1]],
  // CCW
  [[-1, 0]],
];

const kick_offset_180_2x3: number[][][] = [
  // Spawn
  [[0, 0], [0, 1]],
  // CW
  [[0, 0], [1, 0]],
  // 180
  [[0, 0], [0, 0]],
  // CCW
  [[0, 0], [0, 0]],
];

const kick_offset_180_1x4: number[][][] = [
  // Spawn
  [[1, -1], [1, 0]],
  // CW
  [[-1, -1], [0, -1]],
  // 180
  [[0, 0], [0, 0]],
  // CCW
  [[0, 0], [0, 0]],
];

const kick_offset_180_2x2: number[][][] = [
  // Spawn
  [[1, 1]],
  // CW
  [[1, -1]],
  // 180
  [[0, 0]],
  // CCW
  [[0, 0]],
];

function gen_kick_table(offsets: number[][][], offsets_180: number[][][]) {
  let table = new Array(4);
  for (let a = 0; a < 4; a++) {
    table[a] = new Array(4);
    // None
    table[a][a] = [[0, 0]];
    // CW
    let b = spin_cw(a);
    table[a][b] = offsets[a].map((e, i) =>
      e.map((f, j) => f - offsets[b][i][j])
    );
    // CCW
    b = spin_ccw(a);
    table[a][b] = offsets[a].map((e, i) =>
      e.map((f, j) => f - offsets[b][i][j])
    );
    // 180
    b = spin_180(a);
    table[a][b] = offsets_180[a].map((e, i) =>
      e.map((f, j) => f - offsets_180[b][i][j])
    );
  }
  return table;
}

const kicks_2x3 = gen_kick_table(kick_offset_2x3, kick_offset_180_2x3);
const kicks_1x4 = gen_kick_table(kick_offset_1x4, kick_offset_180_1x4);
const kicks_2x2 = gen_kick_table(kick_offset_2x2, kick_offset_180_2x2);

// TILJSZO order
const kick_map = [
  null,
  kicks_2x3,
  kicks_1x4,
  kicks_2x3,
  kicks_2x3,
  kicks_2x3,
  kicks_2x3,
  kicks_2x2,
];

const colour_table = [
  "#2e3440",
  "#b48ead",
  "#88C0D0",
  "#d08770",
  "#5e81ac",
  "#a3be8c",
  "#bf616a",
  "#ebcb8b",
];


export enum PieceEnum {
  X,
  T,
  I,
  L,
  J,
  S,
  Z,
  O
}

export enum Rotation {
  spawn,
  right,
  reversed,
  left
}

export function get_colour(piece: PieceEnum): string {
  return colour_table[piece];
}

export function spin_cw(rotation: Rotation): Rotation {
  return (rotation + 1) % 4;
}

export function spin_180(rotation: Rotation): Rotation {
  return (rotation + 2) % 4;
}

export function spin_ccw(rotation: Rotation): Rotation {
  return (rotation + 3) % 4;
}

export function get_offsets(piece: PieceEnum, rotation: Rotation): number[][] {
  return offsets[piece][rotation];
}

export function get_kicks(piece: PieceEnum, init_rot: Rotation, target_rot: Rotation): number[][] {
  return kick_map[piece]![init_rot][target_rot];
}

export function get_piece_number(piece: Piece): PieceEnum {
  return PieceEnum[piece];
}
