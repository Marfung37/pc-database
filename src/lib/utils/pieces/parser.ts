import type {
  AST,
  FilterBlock,
  GeneratorLiteral,
  BinaryOp,
  UnaryOp,
  RangeLookup,
  CountLiteral,
  BeforeLiteral,
  RegexLiteral
} from './defines';
import { ASTNode, tetrisCompare } from './defines';

type SpecTuple = [name: string, pattern: string];

// constant to just list tokens used for contexts, unused constant
const _CONTEXT_SPEC: SpecTuple[] = [
  ['LBRACE', '\\{'],
  ['RBRACE', '\\}']
];

const GEN_SPEC: SpecTuple[] = [
  ['GEN_PIECES', '[TILJSZO*]|\\[\\^?(?:[TILJSZO]|\\[\\^?[TILJSZO]+\\])+\\]'],
  ['PERMUTE', '!|p\\d+'],
  ['WS', '\\s+'],
  ['MISMATCH', '.']
];

const FILTER_SPEC: SpecTuple[] = [
  ['RANGE_OP', '\\d+(?:-\\d+)?:'],
  ['PIECES', '(?:[TILJSZO*]|\\[[TILJSZO*]+\\])+'],
  ['COMP_OP', '=|<=|>=|!=|=|<|>'],
  ['NUMBER', '\\d+'],
  ['REGEX', '/[^/]+/'],
  ['OR', '\\|\\|'],
  ['AND', '&&'],
  ['NOT', '!'],
  ['LPAREN', '\\('],
  ['RPAREN', '\\)'],
  ['WS', '\\s+'],
  ['MISMATCH', '.']
];

type TokenKind =
  | 'LBRACE'
  | 'RBRACE'
  | 'GEN_PIECES'
  | 'PERMUTE'
  | 'RANGE_OP'
  | 'PIECES'
  | 'COMP_OP'
  | 'NUMBER'
  | 'REGEX'
  | 'OR'
  | 'AND'
  | 'NOT'
  | 'LPAREN'
  | 'RPAREN'
  | 'WS'
  | 'MISMATCH';

function compileLexerRegex(spec: SpecTuple[]): RegExp {
  const fullPattern = spec.map(([name, pattern]) => `(?<${name}>${pattern})`).join('|');

  return new RegExp(fullPattern, 'g');
}

const GEN_REGEX = compileLexerRegex(GEN_SPEC);
const FILTER_REGEX = compileLexerRegex(FILTER_SPEC);

// regex to separate generator and filter contexts
const CONTEXT_SPLIT_REGEX = /(\{.+?\})|([^{}]+)|(.)/g;

class Token {
  constructor(
    public kind: TokenKind,
    public value: string
  ) {}

  toString() {
    return `(${this.kind} ${this.value})`;
  }
}

const LBRACE_TOKEN = new Token('LBRACE', '{');
const RBRACE_TOKEN = new Token('RBRACE', '}');

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];

  for (const match of text.matchAll(CONTEXT_SPLIT_REGEX)) {
    const [_, filterBlock, genBlock, invalid] = match;

    if (genBlock) {
      for (const m of genBlock.matchAll(GEN_REGEX)) {
        const groups = m.groups;
        if (!groups) continue;

        const kind = Object.keys(groups).find((key) => groups[key] !== undefined)!;
        const value = groups[kind];

        // skip whitespace
        if (kind === 'WS') continue;
        if (kind === 'MISMATCH') {
          throw new Error(`Unexpected character '${value}' at position ${m.index}`);
        }

        tokens.push(new Token(kind as TokenKind, value));
      }
    } else if (filterBlock) {
      // strip the {}
      const insideFilter = filterBlock.slice(1, -1);

      tokens.push(LBRACE_TOKEN);

      for (const m of insideFilter.matchAll(FILTER_REGEX)) {
        const groups = m.groups;
        if (!groups) continue;

        const kind = Object.keys(groups).find((key) => groups[key] !== undefined)!;
        let value = groups[kind];

        // skip whitespace
        if (kind === 'WS') continue;
        if (kind === 'REGEX') {
          // strip forward slashes
          value = value.slice(1, -1);
        }
        if (kind === 'MISMATCH') {
          throw new Error(`Unexpected character '${value}' at position ${m.index}`);
        }
        tokens.push(new Token(kind as TokenKind, value));
      }
      tokens.push(RBRACE_TOKEN);
    } else if (invalid) {
      // only possible invalid characters are { or }
      throw new Error(`Found '${invalid}' without its counterpart`);
    }
  }
  return tokens;
}

// expression to get individual piece or sets of pieces
const PIECES_REGEX = /([TILJSZO*]|\[[TILJSZO*]+\])/g;
const GENERATOR_REGEX = /([TILJSZO]|\[\^?[TILJSZO]+\])/g;

const TETRIS_PIECES = new Set('TILJSZO');
const TETRIS_ORDERED_PIECES = Array.from('TILJSZO');

export class Parser {
  private tokens: Token[];
  private pos: number;
  constructor() {
    this.tokens = [];
    this.pos = 0;
  }

  public parse(expr: string): (FilterBlock | GeneratorLiteral)[] {
    this.tokens = tokenize(expr);
    this.pos = 0;

    const result: (FilterBlock | GeneratorLiteral)[] = [];

    while (this.pos < this.tokens.length) {
      if (this.peek().kind === 'LBRACE') {
        this.consume('LBRACE');
        result.push(this.parseFilter());
        this.consume('RBRACE');
      } else {
        result.push(this.parseGenerator());
      }
    }

    return result;
  }

  private peek(): Token {
    // assumes pos is in range
    return this.pos < this.tokens.length ? this.tokens[this.pos] : new Token('MISMATCH', '');
  }

  private consume(expected: TokenKind): Token {
    const token = this.peek();
    if (token.kind !== expected) throw Error(`Expected ${expected} but got ${token.kind}`);

    this.pos++;
    return token;
  }

  private parseGeneratorPool(poolExpr: string): string[] {
    if (poolExpr === '*') return TETRIS_ORDERED_PIECES; // wildcard
    if (poolExpr.length == 1) return [poolExpr]; // singular piece

    // must be a pool with []
    let rawPieces = poolExpr.slice(1, -1);
    const outerComplement = rawPieces.startsWith('^');
    if (outerComplement) {
      // strip the ^
      rawPieces = rawPieces.slice(1);
    }

    const pool: string[] = [];
    let basePieces: string[] = [];

    for (const match of rawPieces.matchAll(GENERATOR_REGEX)) {
      let item = match[0];
      if (item.startsWith('[')) {
        item = item.slice(1, -1);
        let uniquePieces: Set<string>;
        if (item.startsWith('^')) {
          uniquePieces = TETRIS_PIECES.difference(new Set(item.slice(1)));
        } else {
          uniquePieces = new Set(item);
        }

        pool.push([...uniquePieces].sort(tetrisCompare).join(''));
      } else {
        // just a piece
        basePieces.push(item);
      }
    }

    if (outerComplement) {
      // complement the base pieces
      basePieces = [...TETRIS_PIECES.difference(new Set(basePieces))];
    }
    basePieces.sort(tetrisCompare);
    if (basePieces.length > 0) pool.unshift(...basePieces);

    return pool;
  }

  private parseFilterPieces(rawPieces: string, duplicates: boolean = false): string[] {
    let pieces: string[] = [];
    let basePieces: Set<string> = new Set();

    for (const match of rawPieces.matchAll(PIECES_REGEX)) {
      let item = match[0];

      if (item == '*') {
        if (duplicates) pieces.push(...TETRIS_ORDERED_PIECES);
        else basePieces = TETRIS_PIECES;
      } else if (item.startsWith('[')) {
        // strip the []
        item = item.slice(1, -1);

        // duplicates don't affect anything for count/before here
        const itemSet = new Set(item);
        if (itemSet.has('*')) pieces.push('TILJSZO');
        else pieces.push([...itemSet].join(''));
      } else {
        if (duplicates) pieces.push(item);
        else basePieces.add(item);
      }
    }

    if (!duplicates) {
      pieces.push(...[...basePieces].sort(tetrisCompare));
    }

    return pieces;
  }

  private parseGenerator(): GeneratorLiteral {
    if (this.peek().kind === 'GEN_PIECES') {
      const poolExpr = this.consume('GEN_PIECES');

      const pool = this.parseGeneratorPool(poolExpr.value);

      let permute = 1;
      if (pool.length > 1 && this.peek().kind == 'PERMUTE') {
        const permuteExpr = this.consume('PERMUTE');

        if (permuteExpr.value === '!') {
          permute = pool.length;
        } else {
          // strip the p from p<number>
          permute = Number(permuteExpr.value.slice(1));
          if (permute == 0) {
            throw new Error(`Permute cannot be 0 in ${poolExpr.value}p0`);
          }
          if (permute > pool.length) {
            throw new Error(
              `Given permute ${permute} larger than the pool ${poolExpr.value} -> ${pool}`
            );
          }
        }
      }

      return {
        type: ASTNode.GeneratorLiteral,
        pool,
        permute
      };
    } else {
      throw new Error(
        `Expected GEN_PIECES token for generator but got ${this.peek().kind} instead`
      );
    }
  }

  private parseFilter(): FilterBlock {
    return {
      type: ASTNode.FilterBlock,
      expr: this.parseOr()
    };
  }

  private parseOr(): AST {
    let left = this.parseAnd();
    while (this.peek().kind === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      left = {
        type: ASTNode.BinaryOp,
        left,
        op: 'OR',
        right
      };
    }
    return left;
  }

  private parseAnd(): AST {
    let left = this.parseUnary();
    while (this.peek().kind === 'AND') {
      this.consume('AND');
      const right = this.parseUnary();
      left = {
        type: ASTNode.BinaryOp,
        left,
        op: 'AND',
        right
      };
    }
    return left;
  }

  private parseUnary(): AST {
    if (this.peek().kind === 'NOT') {
      this.consume('NOT');
      const expr = this.parseUnary();
      return {
        type: ASTNode.UnaryOp,
        op: 'NOT',
        expr
      };
    }

    // range operator
    if (this.peek().kind === 'RANGE_OP') {
      const rangeExpr = this.consume('RANGE_OP');

      const expr = this.parseUnary();
      const endpoints = rangeExpr.value.slice(0, -1).split('-').map(Number);
      if (endpoints.length == 1) {
        endpoints.unshift(0);
      }

      return {
        type: ASTNode.RangeLookup,
        start: endpoints[0],
        end: endpoints[1],
        expr
      };
    }

    return this.parseAtom();
  }

  private parseAtom(): AST {
    const token = this.peek();

    switch (token.kind) {
      case 'LPAREN':
        this.consume('LPAREN');
        const expr = this.parseOr();
        this.consume('RPAREN');
        return expr;
      case 'REGEX':
        const regexExpr = this.consume('REGEX');
        return {
          type: ASTNode.RegexLiteral,
          value: new RegExp(regexExpr.value)
        };
      case 'PIECES':
        const pieces = this.consume('PIECES').value;
        const op = this.consume('COMP_OP').value;

        const nextToken = this.peek();
        switch (nextToken.kind) {
          case 'PIECES':
            if (op !== '<') {
              throw new Error("Comparison of pieces expression that isn't before operator of <");
            }
            const afterPieces = this.consume('PIECES').value;
            return {
              type: ASTNode.BeforeLiteral,
              beforePieces: this.parseFilterPieces(pieces, true),
              afterPieces: this.parseFilterPieces(afterPieces, true)
            };

          case 'NUMBER':
            const count = Number(this.consume('NUMBER').value);
            return {
              type: ASTNode.CountLiteral,
              pieces: this.parseFilterPieces(pieces),
              op,
              count
            };
          default:
            throw new Error(`Unexpected token after PIECES COMP_OP: ${token}`);
        }
      default:
        throw new Error(`Unexpected token: ${token}`);
    }
  }
}
