import { ASTNode, type GeneratorLiteral, type FilterBlock } from './defines';
import { Parser } from './parser';
import { evaluateFilter } from './evaluateFilter';
import { evaluateGenerator } from './evaluateGenerator';
import { product } from './utils';

const parser = new Parser();

function evaluateBlocks(blocks: (GeneratorLiteral | FilterBlock)[]): string[] {
  let runningQueues: string[][] = [];
  for (const block of blocks) {
    switch (block.type) {
      case ASTNode.GeneratorLiteral:
        runningQueues.push(evaluateGenerator(block));
        break;
      case ASTNode.FilterBlock: {
        const filterFunc = (queue: string) => evaluateFilter((block as FilterBlock).expr, queue);

        runningQueues = [
          (product(runningQueues) as Generator<string>).filter(filterFunc).toArray()
        ];
        break;
      }
    }
  }

  // cannot end with GeneratorLiteral so running iterators should only contain one element
  return runningQueues[0];
}

/**
 * Parses a given pattern into layered list for patterns to be appended together, patterns to be product together, individual blocks in AST
 */
function parsePattern(pattern: string): (GeneratorLiteral | FilterBlock)[][][] {
  // can list separate patterns together using semicolons to just append on
  const patterns = pattern.split(';');
  const parsed: (GeneratorLiteral | FilterBlock)[][][] = [];
  for (const pattern of patterns) {
    // separate into parts where filter will apply
    const parts = pattern.split(',');

    // parse everything and put in parsed
    const allBlocks: (GeneratorLiteral | FilterBlock)[][] = [];
    for (const part of parts) {
      let blocks = parser.parse(part);

      // starting with filter will just be removed as not filtering anything
      while (blocks[0].type == ASTNode.FilterBlock) blocks = blocks.slice(1);

      // GeneratorLiterals at the end can be own separate 'blocks'
      const allBlocksInitialEnd = allBlocks.length;
      while (blocks.length > 0 && blocks[blocks.length - 1].type == ASTNode.GeneratorLiteral)
        allBlocks.splice(allBlocksInitialEnd, 0, [blocks.pop()!]);

      if (blocks.length > 0) allBlocks.splice(allBlocksInitialEnd, 0, blocks);
    }

    parsed.push(allBlocks);
  }

  return parsed;
}

/**
 * Get all queues following sfinder pieces notation
 */
export function sfinderPieces(pattern: string): string[] {
  const runningParts: string[] = [];
  const parsedPattern = parsePattern(pattern);

  for (const appendingParts of parsedPattern) {
    const runningQueues: string[][] = [];
    for (const blocks of appendingParts) {
      runningQueues.push(evaluateBlocks(blocks));
    }

    for (const queue of product(runningQueues) as Generator<string>) {
      runningParts.push(queue);
    }
  }

  return runningParts;
}
