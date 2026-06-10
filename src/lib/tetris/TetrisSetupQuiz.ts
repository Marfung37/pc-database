import { TetrisGame, DEFAULT, type Event, type Mode } from '$lib/tetris/TetrisGame';
import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
import { BAG } from '$lib/constants';
import {
  fumenCountFilledCells,
  isCongruentFumen,
  fumenSplit,
  fumenCountPieces,
  fumenClearLines
} from '$lib/utils/fumenUtils';
import type { Operation } from 'glue-fumen';
import { glueFumen, unglueFumen } from 'glue-fumen';
import { PieceEnum, Rotation } from '$lib/tetris/pieceData';
import type { Fumen, Queue } from '$lib/types';
import { encoder, Field } from 'tetris-fumen';

// TreeNode has keys of pieces and can be another node or index of array
type TreeNode = {
  [K in (typeof BAG)[number]]?: TreeNode | number;
} & {
  default?: number;
};

export type SetupQuizEvent = Event | 'correct' | 'wrong' | 'missing setup';
export type SetupQuizMode = Mode | 'setup quiz';

function traverseTree(root: TreeNode, queue: Queue): number {
  let currentNode: TreeNode = root;
  let lastDefault = -1;
  for (const piece of queue) {
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
  private correctBuild: Record<string, number>;
  private correctSetups: Fumen[] | null = null;
  runningCorrectSetup: Fumen | null = null;
  allowSolving: boolean = false;
  private correctSetupPieceLength: number = -1;

  constructor(
    pattern: string = '',
    handling: Record<string, number> = DEFAULT,
    storageKey: string = 'handling'
  ) {
    super(pattern, handling, storageKey);
    this.pendingEvents = [];
    this.correctBuild = {};
  }

  setPractice(pattern: string) {
    this.setPattern(pattern);
  }

  getSetupData(setups: Fumen[], setupTree: TreeNode, pattern: string) {
    this.mode = 'setup quiz';
    this.setups = setups;
    this.setupTree = setupTree;
    this.setPattern(pattern);
  }

  getCorrectSetup(index: number) {
    if (this.setups !== null) {
      const fullFumen = this.setups[index];
      const fumens = fumenSplit(fullFumen);
      let pageIndex = 0;
      if (fumens.length > 1) {
        // determine which page could be the correct setup
        const queue = this.queue.queue.map((piece) => PieceEnum[piece]).join('') as Queue;

        for (const fumen of fumens) {
          if (glueFumen(fumen, { order: queue, hold: 1, srs180: true }).length > 0) break;
          pageIndex++;
        }
      }
      this.correctSetups = fumens;
      this.runningCorrectSetup = this.correctSetups[pageIndex];
      this.correctBuild = fumenCountPieces(this.correctSetups[pageIndex]);
      this.correctSetupPieceLength = fumenCountFilledCells(this.correctSetups[pageIndex]) / 4;

      // DEBUG
      if (!this.simulating)
        console.log(
          'Correct Setup:',
          this.correctSetups[pageIndex],
          'with',
          this.correctSetupPieceLength,
          'pieces'
        );
    }
  }

  reset(soft: boolean = false): void {
    super.reset(soft);

    if (this.mode == 'setup quiz' && this.setups !== null && this.setupTree !== null) {
      const queue = this.queue.queue.map((piece) => PieceEnum[piece]).join('') as Queue;
      const index = traverseTree(this.setupTree, queue);
      if (index == -1) {
        // error
        console.error('Unable to get correct setup for this queue');
        this.correctSetups = null;
        this.runningCorrectSetup = null;
        this.pendingEvents.push('missing setup');
        return;
      }
      this.getCorrectSetup(index);
    }
  }

  lock(piece: TetrisBoardPiece | null = null) {
    // move piece as far down as possible (hd)
    if (piece !== null) {
      this.active.x = piece.x;
      this.active.y = piece.y;
      this.active.rotation = piece.rotation;
    } else {
      while (this.movePiece(0, -1));
      this.held = false;
      this.operations.push(this.active.copy());
    }

    const lineclears = this.board.place(this.active, true);

    // clear lines so correct setup shows up with the lines cleared
    if (this.mode === 'setup quiz' && this.runningCorrectSetup !== null && lineclears.length > 0) {
      this.runningCorrectSetup = fumenClearLines(this.runningCorrectSetup, lineclears);
    }

    this.pieceCount++;
    this.totalPieceCount++;

    let resetted = false;

    if (
      this.mode === 'setup quiz' &&
      this.correctSetups !== null &&
      this.correctSetupPieceLength == this.pieceCount
    ) {
      let soft: boolean;

      const pages = [];
      const pieceCounts: Record<string, number> = {
        T: 0,
        I: 0,
        L: 0,
        J: 0,
        S: 0,
        Z: 0,
        O: 0
      };

      for (const operation of this.operations.slice(
        this.totalPieceCount - this.pieceCount,
        this.totalPieceCount
      )) {
        const piece = PieceEnum[operation.type];
        pages.push({
          operation: {
            ...operation,
            type: piece,
            rotation: Rotation[operation.rotation]
          } as Operation
        } as { field?: Field; operation: Operation });
        pieceCounts[piece]++;
      }

      // check if correct pieces used
      let correctPieces: boolean = true;
      for (const piece in this.correctBuild) {
        if (pieceCounts[piece] != this.correctBuild[piece]) {
          correctPieces = false;
          break;
        }
      }

      pages[0].field = Field.create();
      const fumen = unglueFumen(encoder.encode(pages)) as Fumen;

      let congruent: boolean = false;
      if (correctPieces) {
        for (const correctFumen of this.correctSetups) {
          congruent ||= isCongruentFumen(fumen, correctFumen, 1);
        }
      }

      if (correctPieces && congruent) {
        soft = false;
        if (!this.simulating) this.pendingEvents.push('correct');
      } else {
        soft = true;
        if (!this.simulating) this.pendingEvents.push('wrong');
      }

      if (!this.allowSolving || soft) {
        this.reset(soft);
        resetted = true;
      }
    }

    // practice pc
    if (
      (this.mode === 'practice' || (this.allowSolving && this.mode == 'setup quiz')) &&
      this.board.isEmpty()
    ) {
      this.reset(this.softReset);
      resetted = true;
    }

    if (this.queue.length == 0) {
      if (this.holdPiece != PieceEnum.X) {
        this.setActive(this.holdPiece);
        this.holdPiece = PieceEnum.X;
      } else {
        // no more pieces
        this.reset(this.softReset);
      }
    } else if (!resetted) {
      this.setActive(this.queue.poll());
    }

    // topped out
    if (this.checkCollide(this.active)) {
      this.reset(this.softReset);
    }
  }
}
