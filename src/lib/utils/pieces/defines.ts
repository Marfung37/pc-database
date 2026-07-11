export interface AST {
  toString(): string;
}

export class FilterBlock implements AST {
  constructor(public expr: AST) {}
}

export class GeneratorLiteral implements AST {
  constructor(
    public pool: string[],
    public permute: number
  ) {}
}

export class BinaryOp implements AST {
  constructor(
    public left: AST,
    public op: string,
    public right: AST
  ) {}
}

export class UnaryOp implements AST {
  constructor(
    public op: string,
    public expr: AST
  ) {}
}

export class RangeLookup implements AST {
  constructor(
    public start: number,
    public end: number,
    public expr: AST
  ) {}
}

export class CountLiteral implements AST {
  constructor(
    public pieces: string[],
    public op: string,
    public count: number
  ) {}
}

export class BeforeLiteral implements AST {
  constructor(
    public beforePieces: string[],
    public afterPieces: string[]
  ) {}
}

export class RegexLiteral implements AST {
  constructor(public value: RegExp) {}
}

// Lookup table for 'priority' of the piece following TILJSZO order
const PIECE_ORDER = new Array(128).fill(999);

PIECE_ORDER['T'.charCodeAt(0)] = 0;
PIECE_ORDER['I'.charCodeAt(0)] = 1;
PIECE_ORDER['L'.charCodeAt(0)] = 2;
PIECE_ORDER['J'.charCodeAt(0)] = 3;
PIECE_ORDER['S'.charCodeAt(0)] = 4;
PIECE_ORDER['Z'.charCodeAt(0)] = 5;
PIECE_ORDER['O'.charCodeAt(0)] = 6;

export function tetrisCompare(piece1: string, piece2: string): number {
  return PIECE_ORDER[piece1.charCodeAt(0)] - PIECE_ORDER[piece2.charCodeAt(0)];
}

// =================================
//    toString implementations
// =================================
FilterBlock.prototype.toString = function (this: FilterBlock) {
  return `Filter(${this.expr})`;
};

GeneratorLiteral.prototype.toString = function (this: GeneratorLiteral) {
  return `Generator(${this.pool}p${this.permute})`;
};

BinaryOp.prototype.toString = function (this: BinaryOp) {
  return `(${this.left} ${this.op} ${this.right})`;
};

UnaryOp.prototype.toString = function (this: UnaryOp) {
  return `(${this.op} ${this.expr})`;
};

RangeLookup.prototype.toString = function (this: RangeLookup) {
  return `Range(${this.start}-${this.end} -> ${this.expr})`;
};

CountLiteral.prototype.toString = function (this: CountLiteral) {
  return `Count(${this.pieces} ${this.op} ${this.count})`;
};

BeforeLiteral.prototype.toString = function (this: BeforeLiteral) {
  return `Before(${this.beforePieces} < ${this.afterPieces})`;
};

RegexLiteral.prototype.toString = function (this: RegexLiteral) {
  return `Regex(\`${this.value.toString()}\`)`;
};
