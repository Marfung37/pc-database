import {
  type AST,
  type Piece,
  type ComparisonOperator,
  type BeforeLiteral,
  PIECE_ORDER
} from './defines';
import { ASTNode } from './defines';

const OPERATORS: Record<ComparisonOperator, (a: number, b: number) => boolean> = {
  '=': (a, b) => a == b,
  '!=': (a, b) => a != b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b
};

/**
 * Builds a map of character positions.
 * e.g., "ISIJ" -> {'I': [0, 2], 'S': [1], 'J': [3]}
 */
function getCharIndices(queue: string): Record<string, number[]> {
  const positions: Record<Piece, number[]> = {
    T: [],
    I: [],
    L: [],
    J: [],
    S: [],
    Z: [],
    O: []
  };
  for (const [index, char] of [...queue].entries()) {
    positions[char as Piece].push(index);
  }
  return positions;
}

interface BeforeIterationNode {
  beforePieceCounts: Uint16Array;
  afterPieceCounts: Uint16Array;
  beforeIndex: number;
  afterIndex: number;
}

function evaluateBefore(node: BeforeLiteral, queue: string): boolean {
  const posMap = getCharIndices(queue);

  // DFS needed to handle stuff like [TI][TS]<O on TIO
  const stack: BeforeIterationNode[] = [];
  stack.push({
    beforePieceCounts: new Uint16Array(7).fill(0),
    afterPieceCounts: new Uint16Array(7).fill(0),
    beforeIndex: 0,
    afterIndex: 0
  });

  while (stack.length > 0) {
    const stackNode = stack.pop()!;

    if (stackNode.beforeIndex == node.beforePieces.length) return true;

    const beforePiece = node.beforePieces[stackNode.beforeIndex];
    const afterPiece = node.afterPieces[stackNode.afterIndex];

    // get neighbors
    for (const bPiece of beforePiece) {
      const bIndices = posMap[bPiece as Piece];
      const bPieceIndex = PIECE_ORDER[bPiece.charCodeAt(0)];
      const bInstanceIdx = stackNode.beforePieceCounts[bPieceIndex];

      // there's no instance of this before piece
      // automatically false I < J if there is no I
      if (bIndices.length <= bInstanceIdx) continue;

      for (const aPiece of afterPiece) {
        const aIndices = posMap[aPiece as Piece];
        const aPieceIndex = PIECE_ORDER[aPiece.charCodeAt(0)];
        const aInstanceIdx = stackNode.afterPieceCounts[aPieceIndex];

        // there's no instance of this after piece
        // automatically satisfies I < J if there's no J yet there is an I
        // OR have both pieces so check order
        if (aIndices.length <= aInstanceIdx || bIndices[bInstanceIdx] < aIndices[aInstanceIdx]) {
          // finish all after pieces so move to next before piece
          if (stackNode.afterIndex + 1 == node.afterPieces.length) {
            const newBeforePieceCounts = stackNode.beforePieceCounts.slice();
            newBeforePieceCounts[bPieceIndex]++;

            stack.push({
              beforePieceCounts: newBeforePieceCounts,
              afterPieceCounts: new Uint16Array(7).fill(0),
              beforeIndex: stackNode.beforeIndex + 1,
              afterIndex: 0
            });

            continue;
          }

          const newAfterPieceCounts = stackNode.afterPieceCounts.slice();
          newAfterPieceCounts[aPieceIndex]++;

          stack.push({
            beforePieceCounts: stackNode.beforePieceCounts,
            afterPieceCounts: newAfterPieceCounts,
            beforeIndex: stackNode.beforeIndex,
            afterIndex: stackNode.afterIndex + 1
          });
        }
      }
    }
  }
  return false;
}

export function evaluateFilter(node: AST, queue: string): boolean {
  switch (node.type) {
    /**
     * Atomic
     */
    case ASTNode.RegexLiteral:
      // Compile the regex and check for a match
      return queue.match(node.value) !== null;
    case ASTNode.CountLiteral: {
      const comp = OPERATORS[node.op];
      for (const target of node.pieces) {
        let result = false;
        for (const piece of target) {
          // set of pieces: [LJ] = 1 means that # of L = 1 OR # of J = 1
          let count = 0;
          for (const p of queue) if (p == piece) count++;
          if (comp(count, node.count)) {
            result = true;
            break;
          }
        }
        // this piece part is not satisfied so short circuit as false
        if (!result) return false;
      }
      return true;
    }

    case ASTNode.BeforeLiteral:
      return evaluateBefore(node, queue);

    /**
     * Operators
     */

    // restrict range of queue to apply expr
    case ASTNode.RangeLookup:
      return evaluateFilter(node.expr, queue.slice(node.start, node.end));

    case ASTNode.UnaryOp:
      return !evaluateFilter(node.expr, queue);

    case ASTNode.BinaryOp: {
      // Evaluate left side first
      const left = evaluateFilter(node.left, queue);

      // short circuit if possible
      if (node.op === 'AND' && !left) return false;
      if (node.op === 'OR' && left) return true;

      // evaluate and return right side otherwise
      return evaluateFilter(node.right, queue);
    }

    default:
      // error case
      throw new Error(`Unknown AST node type or operation: ${node.type}`);
  }
}
