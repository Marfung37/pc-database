import { TetrisGame, DEFAULT } from '$lib/tetris/TetrisGame';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { BAG } from '$lib/constants';
import { fumenCountFilledCells, isCongruentFumen } from '$lib/utils/fumenUtils';
import { PieceEnum } from '$lib/tetris/pieceData';
import type { Fumen, Queue } from '$lib/types';

// TreeNode has keys of pieces and can be another node or index of array
type TreeNode = {
  [K in typeof BAG[number]]?: TreeNode | number;
} & {
  default?: number;
}

function traverseTree(root: TreeNode, queue: Queue): number {
  let currentNode: TreeNode = root;
  let lastDefault = -1;
  for (let piece of queue) {
    if (typeof currentNode[piece] === 'number') return currentNode[piece];
    if (currentNode[piece] === undefined) return lastDefault;

    currentNode = currentNode[piece];

    if (currentNode.default !== undefined) lastDefault = currentNode.default;
  }
  return lastDefault;
}

export class TetrisSetupQuiz extends TetrisGame {
  isSetupQuiz: boolean;
  private setupTree: TreeNode | null = null;
  private setups: Fumen[] | null = null;
  correctSetup: Fumen | null = null;
  private correctSetupPieceLength: number = -1;
  private showCorrectSetup: boolean;

  constructor(
    pattern: string = '',
    handling: Record<string, number> = DEFAULT,
    storageKey: string = 'handling'
  ) {
    super(pattern, handling, storageKey);
    this.isSetupQuiz = false;
    this.showCorrectSetup = false;
  }

  getSetupData(setups: Fumen[], setupTree: TreeNode, pattern: string) {
    this.isSetupQuiz = true;
    this.setups = setups;
    this.setupTree = setupTree;
    this.setPattern(pattern);

    this.seed = this.random.reseed();
    this.operations = [];
    this.reset();
  }

  getCorrectSetup(index: number) {
    if(this.setups !== null) {
      this.correctSetup = this.setups[index];
      this.correctSetupPieceLength = fumenCountFilledCells(this.correctSetup) / 4;

      // DEBUG
      if (!this.simulating)
        console.log('Correct Setup:', this.correctSetup, 'with', this.correctSetupPieceLength, 'pieces');
    }
  }

  reset(soft: boolean = false): void {
    super.reset(soft);

    if (this.isSetupQuiz && this.setups !== null && this.setupTree !== null) {
      const queue = this.queue.queue.map((piece) => PieceEnum[piece]).join('') as Queue;
      const index = traverseTree(this.setupTree, queue);
      if (index == -1) {
        // error
        console.error('Unable to get correct setup for this queue');
        this.correctSetup = null;
        return;
      }
      this.getCorrectSetup(index);
    }
  }

  lock(piece: TetrisBoardPiece | null = null) {
    super.lock(piece);
  
    if (this.isSetupQuiz && 
        this.correctSetup !== null && 
        this.correctSetupPieceLength == this.pieceCount) {
      const soft = !isCongruentFumen(this.board.toFumen(), this.correctSetup, 1);
      this.reset(soft);
    }
  }
}
