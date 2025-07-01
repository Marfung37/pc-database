// Utility function: multiset subset
function isMultisetSubset(wanted: string, target: string): boolean {
  const wantedCounts: Record<string, number> = {};
  for (const c of wanted) {
    wantedCounts[c] = (wantedCounts[c] ?? 0) + 1;
  }

  const targetCounts: Record<string, number> = {};
  for (const c of target) {
    targetCounts[c] = (targetCounts[c] ?? 0) + 1;
  }

  return Object.entries(wantedCounts).every(
    ([char, count]) => (targetCounts[char] ?? 0) >= count
  );
}

// Utility function: allIndex
export function allIndex(seq: Iterable<boolean>): number[] {
  const result: number[] = [];
  let i = 0;
  for (const val of seq) {
    if (val) result.push(i);
    i++;
  }
  return result;
}

// Token specification
const TOKEN_SPEC: [string, string][] = [
  ['OR', '\\|\\|'],
  ['AND', '&&'],
  ['NOT', '!'],
  ['AVOID', '\\^'],
  ['LPAREN', '\\('],
  ['RPAREN', '\\)'],
  ['REGEX', '/[^/]+/'],
  ['PIECES', '[TILJSZO]+' ],
  ['WS', '\\s+'],
];

const MASTER_REGEX = TOKEN_SPEC
  .map(([name, pattern]) => `(?<${name}>${pattern})`)
  .join('|');
const tokenRe = new RegExp(MASTER_REGEX, 'g');

// Token class
export class Token {
  constructor(
    public kind: string | null = null,
    public value: string | null = null
  ) {}
  toString() {
    return `(${this.kind}, '${this.value}')`;
  }
}

// AST base class
export abstract class AST {}

// AST node classes
export class BinaryOp extends AST {
  constructor(
    public left: AST,
    public op: string,
    public right: AST
  ) {
    super();
  }
  toString() {
    return `(${this.left} ${this.op} ${this.right})`;
  }
}

export class UnaryOp extends AST {
  constructor(
    public op: string,
    public expr: AST
  ) {
    super();
  }
  toString() {
    return `(${this.op} ${this.expr})`;
  }
}

export class PiecesLiteral extends AST {
  constructor(public value: string) {
    super();
  }
  toString() {
    return `Pieces(${this.value})`;
  }
}

export class RegexLiteral extends AST {
  constructor(public value: string) {
    super();
  }
  toString() {
    return `Regex(\`${this.value}\`)`;
  }
}

// Tokenizer
export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(text)) !== null) {
    const kind = Object.entries(match.groups ?? {}).find(
      ([, v]) => v !== undefined
    )?.[0];
    let value = match[0];
    if (kind === 'WS') continue;
    if (kind === 'REGEX') value = value.slice(1, -1); // strip slashes
    tokens.push(new Token(kind, value));
  }
  if (tokens.length === 0) {
    throw new Error(`Expression '${text}' could not be tokenized`);
  }
  return tokens;
}

// Parser
export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  constructor(
    private lexer: (text: string) => Token[] = tokenize
  ) {}

  private peek(): Token {
    return this.pos < this.tokens.length ? this.tokens[this.pos] : new Token();
  }

  private consume(expected?: string): Token {
    const token = this.peek();
    if (expected && token.kind !== expected) {
      throw new Error(`Expected ${expected} but got ${token.kind}`);
    }
    this.pos++;
    return token;
  }

  parse(expr: string, lexer?: (s: string) => Token[]): AST {
    const l = lexer ?? this.lexer;
    this.tokens = l(expr);
    this.pos = 0;
    return this.parseTokens();
  }

  private parseTokens(): AST {
    return this.parseOr();
  }

  private parseOr(): AST {
    let left = this.parseAnd();
    while (this.peek().kind === 'OR') {
      this.consume('OR');
      const right = this.parseAnd();
      left = new BinaryOp(left, 'OR', right);
    }
    return left;
  }

  private parseAnd(): AST {
    let left = this.parseUnary();
    while (this.peek().kind === 'AND') {
      this.consume('AND');
      const right = this.parseUnary();
      left = new BinaryOp(left, 'AND', right);
    }
    return left;
  }

  private parseUnary(): AST {
    const token = this.peek();
    if (token.kind === 'NOT') {
      this.consume('NOT');
      const expr = this.parseUnary();
      return new UnaryOp('NOT', expr);
    }
    if (token.kind === 'AVOID') {
      this.consume('AVOID');
      const expr = this.parseUnary();
      return new UnaryOp('AVOID', expr);
    }
    return this.parseAtom();
  }

  private parseAtom(): AST {
    const token = this.peek();
    if (!token) throw new Error('Unexpected end of tokens');

    if (token.kind === 'LPAREN') {
      this.consume('LPAREN');
      const expr = this.parseTokens();
      this.consume('RPAREN');
      return expr;
    }
    if (token.kind === 'REGEX') {
      const regexExpr = this.consume('REGEX');
      if (regexExpr.value === null)
        throw new Error('Empty REGEX token');
      return new RegexLiteral(regexExpr.value);
    }
    if (token.kind === 'PIECES') {
      const pieces = this.consume('PIECES');
      if (pieces.value === null)
        throw new Error('Empty PIECES token');
      return new PiecesLiteral(pieces.value);
    }
    throw new Error(`Unexpected token: ${token}`);
  }
}

// Evaluator
export function evaluateAst(node: AST, saves: string[]): boolean {
  if (node instanceof PiecesLiteral) {
    return saves.some(s => isMultisetSubset(node.value, s));
  }
  if (node instanceof RegexLiteral) {
    const re = new RegExp(node.value);
    return saves.some(s => re.test(s));
  }
  if (node instanceof UnaryOp) {
    if (node.op === 'NOT') return !evaluateAst(node.expr, saves);
    if (node.op === 'AVOID') {
      return saves.some(s => !evaluateAst(node.expr, [s]));
    }
  }
  if (node instanceof BinaryOp) {
    const left = evaluateAst(node.left, saves);
    if (node.op === 'AND' && !left) return false;
    if (node.op === 'OR' && left) return true;
    return evaluateAst(node.right, saves);
  }
  throw new Error(`Unknown AST node: ${node}`);
}

export function evaluateAstAll(node: AST, saves: string[]): number[] {
  if (node instanceof PiecesLiteral) {
    return allIndex(saves.map(s => isMultisetSubset(node.value, s)));
  }
  if (node instanceof RegexLiteral) {
    const re = new RegExp(node.value);
    return allIndex(saves.map(s => re.test(s)));
  }
  if (node instanceof UnaryOp) {
    if (node.op === 'NOT') {
      const all = new Set(Array.from({ length: saves.length }, (_, i) => i));
      const neg = new Set(evaluateAstAll(node.expr, saves));
      return [...[...all].filter(i => !neg.has(i))];
    }
    if (node.op === 'AVOID') {
      return allIndex(saves.map(s => !evaluateAstAll(node.expr, [s]).length));
    }
  }
  if (node instanceof BinaryOp) {
    const left = evaluateAstAll(node.left, saves);
    if (node.op === 'AND' && left.length === 0) return [];
    if (node.op === 'OR' && left.length > 0) return left;
    return evaluateAstAll(node.right, saves);
  }
  throw new Error(`Unknown AST node: ${node}`);
}
