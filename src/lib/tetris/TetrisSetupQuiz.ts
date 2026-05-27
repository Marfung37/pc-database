import { TetrisGame, DEFAULT, type Event, type Mode } from '$lib/tetris/TetrisGame';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { BAG } from '$lib/constants';
import { fumenCountFilledCells, isCongruentFumen, fumenSplit } from '$lib/utils/fumenUtils';
import glueFumen from '$lib/utils/GluingFumens/src/lib/glueFumen';
import { PieceEnum } from '$lib/tetris/pieceData';
import type { Fumen, Queue } from '$lib/types';

// TreeNode has keys of pieces and can be another node or index of array
type TreeNode = {
  [K in typeof BAG[number]]?: TreeNode | number;
} & {
  default?: number;
}

type SetupQuizEvent = Event | 'correct' | 'wrong' | 'missing setup';
type SetupQuizMode = Mode | 'setup quiz';

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
  declare pendingEvents: SetupQuizEvent[];
  declare mode: SetupQuizMode;
  private setupTree: TreeNode | null = null;
  private setups: Fumen[] | null = null;
  correctSetup: Fumen | null = null;
  private correctSetupPieceLength: number = -1;

  constructor(
    pattern: string = '',
    handling: Record<string, number> = DEFAULT,
    storageKey: string = 'handling'
  ) {
    super(pattern, handling, storageKey);
    this.pendingEvents = [];
  }

  setPractice(pattern: string) {
    if (this.mode !== 'setup quiz') {
      if (pattern === '') 
        this.mode = 'pure';
      else
        this.mode = 'practice';
    }
    this.setPattern(pattern);
  }

  getSetupData(setups: Fumen[], setupTree: TreeNode, pattern: string) {
    this.mode = 'setup quiz';
    this.setups = setups;
    this.setupTree = setupTree;
    this.setPattern(pattern);
  }

  getCorrectSetup(index: number) {
    if(this.setups !== null) {
      const fullFumen = this.setups[index];
      const fumens = fumenSplit(fullFumen);
      let pageIndex = 0;
      if (fumens.length > 1) {
        // determine which page could be the correct setup
        const queue = this.queue.queue.map((piece) => PieceEnum[piece]).join('') as Queue;

        for (let fumen of fumens) {
          if (glueFumen(fumen, -1, false, queue, 1).length > 0)
            continue
          pageIndex++;
        }
      }
      this.correctSetup = fumens[pageIndex];
      this.correctSetupPieceLength = fumenCountFilledCells(this.correctSetup) / 4;

      // DEBUG
      if (!this.simulating)
        console.log('Correct Setup:', this.correctSetup, 'with', this.correctSetupPieceLength, 'pieces');
    }
  }

  reset(soft: boolean = false): void {
    super.reset(soft);

    console.log(this.mode);
    if (this.mode == 'setup quiz' && this.setups !== null && this.setupTree !== null) {
      const queue = this.queue.queue.map((piece) => PieceEnum[piece]).join('') as Queue;
      const index = traverseTree(this.setupTree, queue);
      if (index == -1) {
        // error
        console.error('Unable to get correct setup for this queue');
        this.correctSetup = null;
        this.pendingEvents.push('missing setup');
        return;
      }
      this.getCorrectSetup(index);
    }
  }

  lock(piece: TetrisBoardPiece | null = null) {
    super.lock(piece);

    console.log('Pieces placed:', this.pieceCount);
  
    if (this.mode === 'setup quiz' && 
        this.correctSetup !== null && 
        this.correctSetupPieceLength == this.pieceCount) {
      let soft: boolean;

      // DEBUG
      console.log(this.board.toFumen());

      if (isCongruentFumen(this.board.toFumen(), this.correctSetup, 1)) {
        soft = false;
        if(!this.simulating)
          this.pendingEvents.push('correct');
      } else {
        soft = true;
        if(!this.simulating)
          this.pendingEvents.push('wrong');
      }
      this.reset(soft);
    }
  }
}
