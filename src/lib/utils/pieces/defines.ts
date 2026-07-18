export enum ASTNode {
  FilterBlock,
  GeneratorLiteral,
  BinaryOp,
  UnaryOp,
  RangeLookup,
  CountLiteral,
  BeforeLiteral,
  RegexLiteral
}

export type AST =
  | FilterBlock
  | GeneratorLiteral
  | BinaryOp
  | UnaryOp
  | RangeLookup
  | CountLiteral
  | BeforeLiteral
  | RegexLiteral;

export interface FilterBlock {
  type: ASTNode.FilterBlock;
  expr: AST;
}

export interface GeneratorLiteral {
  type: ASTNode.GeneratorLiteral;
  pool: string[];
  permute: number;
}

export interface BinaryOp {
  type: ASTNode.BinaryOp;
  left: AST;
  op: string;
  right: AST;
}

export interface UnaryOp {
  type: ASTNode.UnaryOp;
  op: string;
  expr: AST;
}

export interface RangeLookup {
  type: ASTNode.RangeLookup;
  start: number;
  end: number;
  expr: AST;
}

export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=';

export interface CountLiteral {
  type: ASTNode.CountLiteral;
  pieces: string[];
  op: ComparisonOperator;
  count: number;
}

export interface BeforeLiteral {
  type: ASTNode.BeforeLiteral;
  beforePieces: string[];
  afterPieces: string[];
}

export interface RegexLiteral {
  type: ASTNode.RegexLiteral;
  value: RegExp;
}

export type Piece = 'T' | 'I' | 'L' | 'J' | 'S' | 'Z' | 'O';
export type Block = GeneratorLiteral | FilterBlock;
export type ParsedPattern = (GeneratorLiteral | FilterBlock)[][][];

// Lookup table for 'priority' of the piece following TILJSZO order
export const PIECE_ORDER = new Int8Array(128).fill(255);

PIECE_ORDER['T'.charCodeAt(0)] = 0;
PIECE_ORDER['I'.charCodeAt(0)] = 1;
PIECE_ORDER['L'.charCodeAt(0)] = 2;
PIECE_ORDER['J'.charCodeAt(0)] = 3;
PIECE_ORDER['S'.charCodeAt(0)] = 4;
PIECE_ORDER['Z'.charCodeAt(0)] = 5;
PIECE_ORDER['O'.charCodeAt(0)] = 6;

export function tetrisCompare(queue1: string, queue2: string): number {
  const length = Math.min(queue1.length, queue2.length);
  for (let i = 0; i < length; i++) {
    const value = PIECE_ORDER[queue1.charCodeAt(i)] - PIECE_ORDER[queue2.charCodeAt(i)];
    if (value != 0) return value;
  }
  return 0;
}
