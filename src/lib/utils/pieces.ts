// Constants
const BAG = 'TILJSZO';
const WHITESPACE = new Set([' ', '\t', '\n', '\r', '\v', '\f']);

// Types
type Iterable<T> = T[] | Set<T>;
type ModifierTree = (string | ModifierTree)[];

// Sort queues
function sortQueues(queues: Iterable<string>): string[] {
  /**
   * Sort the queue with TILJSZO ordering
   *
   * @param queues - list of queues to sort
   * @returns list of sorted queues
   */

  const pieceValues: Record<string, string> = {
    T: '1',
    I: '2',
    L: '3',
    J: '4',
    S: '5',
    Z: '6',
    O: '7'
  };

  const queueSetValues = (q: string) =>
    parseInt(
      q
        .split('')
        .map((p) => pieceValues[p])
        .join(''),
      10
    );

  return [...queues].sort((a, b) => queueSetValues(a) - queueSetValues(b));
}

// Get the pieces from the normal sfinder format
function parseInput(inputPattern: string, bsortQueues: boolean = true): Iterable<string> {
  /**
   * Get the pieces from the normal sfinder format or inputted files
   *
   * @param inputPattern - string input for queues
   * @param bsortQueues - whether it should sort the outputed queues
   * @returns a generator or list of the queues
   */

  // Two sections with prefix of pieces and suffix of permutate
  const prefixPattern = /([*TILJSZO]|\[\^?[TILJSZO]+\]|<.*>)/;
  const suffixPattern = /(p[1-7]|!)?/;

  // Regex find all the parts
  const patternParts: [string, string][] = [];
  let remaining = inputPattern;

  while (remaining.length > 0) {
    const prefixMatch = remaining.match(prefixPattern);
    if (!prefixMatch || prefixMatch.index !== 0) {
      throw new Error('Failed to separate input into parts');
    }

    const prefix = prefixMatch[0];
    remaining = remaining.slice(prefix.length);

    const suffixMatch = remaining.match(suffixPattern);
    if (!suffixMatch || suffixMatch.index !== 0) {
      throw new Error('Failed to separate input into parts');
    }

    const suffix = suffixMatch[0];
    remaining = remaining.slice(suffix.length);

    patternParts.push([prefix, suffix]);
  }

  // Check if there wasn't a mistake in the finding of parts
  if (patternParts.map((p) => p.join('')).join('') !== inputPattern) {
    throw new Error('Failed to separate input into parts');
  }

  // Generate the queues
  const queues: Set<string>[] = [];
  for (const [piecesFormat, permutateFormat] of patternParts) {
    // Generate the actual pieces

    let actualPieces: string;

    // Just a wildcard or a piece
    if (piecesFormat.length === 1) {
      if (piecesFormat === '*') {
        actualPieces = BAG;
      } else {
        actualPieces = piecesFormat; // a piece
      }
    }
    // Is a set of pieces
    else if (piecesFormat.startsWith('[^') && piecesFormat.endsWith(']')) {
      const pieces = piecesFormat.slice(2, -1);
      actualPieces = [...BAG].filter((p) => !pieces.includes(p)).join('');

      if (actualPieces === '') {
        throw new Error(`Empty actual pieces from ${piecesFormat}`);
      }
    } else if (piecesFormat.startsWith('[') && piecesFormat.endsWith(']')) {
      actualPieces = piecesFormat.slice(1, -1);
    // }
    // Is a file
    // else if (piecesFormat.startsWith('<') && piecesFormat.endsWith('>')) {
    //   const filename = piecesFormat.slice(1, -1);
    //   // In browser environment, file reading would need to be handled differently
    //   throw new Error('File reading not implemented in browser environment');
    } else {
      // Invalid pieces format
      throw new Error(`The pieces ${piecesFormat} could not be parsed!`);
    }

    // Actual pieces is generated

    // Determine the permutate for the pieces
    if (permutateFormat !== '') {
      // ! ending meaning permutation of the pieces
      if (permutateFormat === '!') {
        const perms = permutations([...actualPieces]);
        queues.push(new Set(perms.map((p) => p.join(''))) as Set<string>);
      }
      // Some permute n ending
      else {
        // Get the number at the end after p
        const permutateNum = parseInt(permutateFormat.slice(1), 10);

        // As long as the number is at most the length of the pieces
        if (permutateNum <= actualPieces.length) {
          const perms = permutations([...actualPieces], permutateNum);
          queues.push(new Set(perms.map((p) => p.join(''))) as Set<string>);
        } else {
          // Error
          throw new Error(
            `${inputPattern} has ${permutateFormat}` +
              ` even though ${piecesFormat} has length ${actualPieces.length}`
          );
        }
      }
    } else {
      // 1 piece queues
      queues.push(new Set(actualPieces));
    }
  }

  // Do the product of each part for one long queue
  let result: Iterable<string> = cartesianProduct(...queues).map((arr) => arr.join(''));

  // Sort the queues
  if (bsortQueues) {
    result = sortQueues(result);
  }

  // Return the queues
  return result;
}

// Helper function for cartesian product
function cartesianProduct<T>(...sets: Iterable<T>[]): T[][] {
  return sets.reduce<T[][]>(
    (acc, set) => {
      const result: T[][] = [];
      for (const x of acc) {
        for (const y of set) {
          result.push([...x, y]);
        }
      }
      return result;
    },
    [[]]
  );
}

// Helper function for permutations
function permutations<T>(elements: Iterable<T>, length?: number): T[][] {
  const arr = [...elements];
  const len = length ?? arr.length;

  if (len > arr.length) return [];
  if (len === 0) return [[]];

  const result: T[][] = [];

  function permute(current: T[], remaining: T[]) {
    if (current.length === len) {
      result.push([...current]);
      return;
    }

    for (let i = 0; i < remaining.length; i++) {
      const newCurrent = [...current, remaining[i]];
      const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];
      permute(newCurrent, newRemaining);
    }
  }

  permute([], arr);
  return result;
}

// Make tree of the modifier to allow for easier parsing
function makeModifierTree(
  modifier: string,
  index: number = 0,
  depth: number = 0,
  returnLength: boolean = false
): ModifierTree | [ModifierTree, number] {
  /**
   * Make tree of the modifier
   *
   * @param modifier - modifier string
   * @param index - index of the modifier been parsed
   * @param depth - depth of the recursion
   * @param returnLength - whether to return the length parsed
   * @returns tree of the parsed modifier
   */

  // Holds the tree
  const modifierTree: ModifierTree = [];

  // String to hold the current string before appending to tree
  let parsingModifierEle = '';

  // Run through each character of the modifier
  while (index < modifier.length) {
    // Get the character at that index
    const char = modifier[index];

    // Check if the char is the start of a regex expression
    if (char === '/') {
      // Get the index of closing regex /
      const closingSlashIndex = modifier.indexOf('/', index + 1);

      if (closingSlashIndex === -1) {
        throw new Error(`No closing slash for regex at '${modifier.slice(index)}'`);
      }

      // Get the text in the regex and add to the parsingModifierEle
      parsingModifierEle += modifier.slice(index, closingSlashIndex + 1);

      // Move index to end of the regex
      index = closingSlashIndex;
    }
    // Opening parentheses
    else if (char === '(') {
      // Handle the subtree with recursion
      const [subTree, i] = makeModifierTree(modifier, index + 1, depth + 1, true) as [
        ModifierTree,
        number
      ];

      // Add any prefixes
      subTree.unshift(parsingModifierEle);
      parsingModifierEle = '';

      // Add the sub tree to the tree
      modifierTree.push(subTree);

      // Move index to the end of the parentheses section
      index = i;
    }
    // Closing parentheses
    else if (char === ')') {
      // If on a sub tree
      if (depth !== 0) {
        // Add the current string to the subtree
        if (parsingModifierEle) {
          modifierTree.push(parsingModifierEle);
        }

        // Return the sub tree
        if (returnLength) {
          return [modifierTree, index];
        } else {
          return modifierTree;
        }
      }
      // On the main tree and error
      else {
        throw new Error(`Missing opening parentheses with '${modifier.slice(0, index + 1)}'`);
      }
    }
    // Boolean operator
    else if (char === '&' || char === '|') {
      if (parsingModifierEle) {
        // Append the current string to tree
        modifierTree.push(parsingModifierEle);
        parsingModifierEle = '';
      }

      // If there's two & or |
      if (modifier[index + 1] === char) {
        // Append the operator the tree
        modifierTree.push(char + char);
        index += 1;
      }
      // There's only one & or |
      else {
        throw new Error(`Missing second character of '${char}'`);
      }
    }
    // End of modifier
    else if (char === '}') {
      // Append the final current string if on the main tree
      if (depth === 0) {
        if (parsingModifierEle) {
          modifierTree.push(parsingModifierEle);
        }
      }
      // On a sub tree meaning no closing parentheses
      else {
        throw new Error('Missing closing parentheses');
      }

      // Return the main tree
      if (returnLength) {
        return [modifierTree, index];
      } else {
        return modifierTree;
      }
    }
    // Some other character
    // Ignore whitespace
    else if (!WHITESPACE.has(char)) {
      parsingModifierEle += char;
    }

    // Increment the index
    index += 1;
  }

  // Append the final current string if on the main tree
  if (depth === 0) {
    if (parsingModifierEle) {
      modifierTree.push(parsingModifierEle);
    }
  }
  // On a sub tree meaning no closing parentheses
  else {
    throw new Error('Missing closing parentheses');
  }

  // Return the main tree
  if (returnLength) {
    return [modifierTree, index];
  } else {
    return modifierTree;
  }
}

// Handle operator in the modifier
function handleOperatorInModifier(
  currBool: boolean,
  newBool: boolean,
  operator: string,
  modifierType: string
): boolean {
  /** Handle the operator in the modifier */

  // And operator
  switch (operator) {
    case '&&':
      return currBool && newBool;
    case '||':
      return currBool || newBool;
    default:
      // Something went wrong
      const errorPrefix =
        'Something went wrong when parsing leading to not catching no operator before a ';
      throw new Error(errorPrefix + modifierType);
  }
}

// Handle prefixes in modifier
function handlePrefixesInModifier(modifierPart: string, queue: string): [string, string, boolean] {
  let hasPrefixes = modifierPart.length > 0; // If modifier part is empty or not
  let subQueue = queue;
  let negate = false;

  while (hasPrefixes) {
    // Handle if there's an indexing or length
    const sliceMatchObj = modifierPart.match(/^(\d*-?\d+):(.*)$/);
    if (sliceMatchObj) {
      // Get the prefix and the modifier part
      const piecesSliceIndex = sliceMatchObj[1];
      modifierPart = sliceMatchObj[2];

      // Get the indices
      const sliceIndices = piecesSliceIndex.split('-');

      // Check if it's a length or two indices
      if (sliceIndices.length === 2) {
        // Start and end indices
        subQueue = queue.slice(parseInt(sliceIndices[0]), parseInt(sliceIndices[1]));
      } else {
        // End index or ie length
        subQueue = queue.slice(0, parseInt(sliceIndices[0]));
      }

      hasPrefixes = modifierPart.length > 0; // If modifier part is empty or not
    }
    // Handle not modifier
    else if (modifierPart[0] === '!') {
      // Flip not modifier
      negate = !negate;
      modifierPart = modifierPart.slice(1);

      hasPrefixes = modifierPart.length > 0; // If modifier part is empty or not
    } else {
      hasPrefixes = false;
    }
  }

  return [modifierPart, subQueue, negate];
}

// Handle the different operators for the count modifier
function handleCountModifier(
  countPieces: string,
  queue: string,
  relationalOperator: string,
  num: number,
  setNotation: boolean = false
): boolean {
  /** Handle the different operators for count modifier */

  // Check each piece
  for (const piece of countPieces) {
    // Count the number of occurrences of that piece
    const pieceCount = queue.split(piece).length - 1;

    // Handle all the possible operators
    if (relationalOperator === '=' || relationalOperator === '==') {
      if (pieceCount !== num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    } else if (relationalOperator === '!=') {
      if (pieceCount === num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    } else if (relationalOperator === '<') {
      if (pieceCount >= num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    } else if (relationalOperator === '>') {
      if (pieceCount <= num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    } else if (relationalOperator === '<=') {
      if (pieceCount > num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    } else if (relationalOperator === '>=') {
      if (pieceCount < num) {
        if (!setNotation) {
          return false;
        }
      } else if (setNotation) {
        return true;
      }
    }
  }

  return !setNotation;
}

// Handle the before operator
function handleBeforeOperator(beforePieces: string, afterPieces: string, queue: string): boolean {
  /** Handle the before operator */
  let beforePiecesArr = [...beforePieces];
  let afterPiecesArr = [...afterPieces];

  // Set notation
  let beforeSetNotation = false;
  if (beforePiecesArr[0] === '[' && beforePiecesArr[beforePiecesArr.length - 1] === ']') {
    beforeSetNotation = true;
    beforePiecesArr = beforePiecesArr.slice(1, -1);
  }

  let afterSetNotation = false;
  if (afterPiecesArr[0] === '[' && afterPiecesArr[afterPiecesArr.length - 1] === ']') {
    afterSetNotation = true;
    afterPiecesArr = afterPiecesArr.slice(1, -1);
  }

  // Tries to match all the pieces in beforePieces before seeing any of the after pieces
  for (const piece of queue) {
    // Check if it's an after piece
    if (afterPiecesArr.includes(piece)) {
      if (afterSetNotation) {
        // Remove this piece from the after pieces
        afterPiecesArr.splice(afterPiecesArr.indexOf(piece), 1);

        if (afterPiecesArr.length === 0) {
          return false;
        }
      } else {
        // Hit a after piece before getting through all the before pieces
        return false;
      }
    }
    // Check if it's a before piece
    else if (beforePiecesArr.includes(piece)) {
      // If setNotation then any piece is fine as long as it's before
      if (beforeSetNotation) {
        return true;
      }

      // Remove this piece from the before pieces
      beforePiecesArr.splice(beforePiecesArr.indexOf(piece), 1);

      // If beforePieces is empty
      if (beforePiecesArr.length === 0) {
        return true;
      }
    }
  }

  // If gone through the whole queue and still not sure, then assume False
  return false;
}

// Check if a queue is allowed by the modifier
function checkModifier(queue: string, modifierTree: ModifierTree): boolean {
  /** Check if a queue is allowed by the modifier */
  // Holds the current boolean as parse through the modifier tree
  let currBool = true;

  // Operator starts with and
  let operator = '&&';

  // For each modifier part in the tree
  for (const modifierPart of modifierTree) {
    if (Array.isArray(modifierPart)) {
      let modifierPartStr = '';
      let subModifierTree: ModifierTree = [];

      if (typeof modifierPart[0] === 'string') {
        modifierPartStr = modifierPart[0];
        subModifierTree = modifierPart.slice(1);
      } else {
        subModifierTree = modifierPart;
      }

      // Get the info from prefixes
      const [_, subQueue, negate] = handlePrefixesInModifier(modifierPartStr, queue);

      // Get the boolean from the submodifier
      const subModifierCheck = negate !== checkModifier(subQueue, subModifierTree);

      // Get new current boolean
      currBool = handleOperatorInModifier(currBool, subModifierCheck, operator, 'sub modifier');

      // If currBool is False and the rest of the tree are and (which should be common), then return False directly
      if (!currBool) {
        // Try to find any or operators
        if (!modifierTree.some((part) => part === '||')) {
          // Don't find any other '||', therefore all ands or near the end and can simply return False
          return false;
        }
      }

      // Clear the operator
      operator = '';
    }
    // Handle the modifiers
    else if (typeof modifierPart === 'string') {
      // Handle prefixes
      const [newModifierPart, subQueue, negate] = handlePrefixesInModifier(modifierPart, queue);

      // Count modifier
      const countModifierMatchObj = newModifierPart.match(
        /^([\[\]TILJSZO*]+)([<>]|[<>=!]?=)(\d+)$/
      );
      if (countModifierMatchObj) {
        // Get the different sections of the count modifier
        const countPieces = countModifierMatchObj[1];
        const relationalOperator = countModifierMatchObj[2];
        const num = parseInt(countModifierMatchObj[3], 10);

        // Separate any set notation
        const countPiecesParts = countPieces.split(/(\[[TILJSZO*]+\])/).filter(Boolean);

        // Handle each part
        let countBool = true;
        for (const part of countPiecesParts) {
          // Set notation
          let setNotation = false;
          let actualPart = part;
          if (part.startsWith('[') && part.endsWith(']')) {
            setNotation = true;
            actualPart = part.slice(1, -1);
          }

          // Allow for wildcard
          if (actualPart === '*') {
            actualPart = BAG;
          }

          // Get the boolean for the count modifier
          countBool = handleCountModifier(
            actualPart,
            subQueue,
            relationalOperator,
            num,
            setNotation
          );

          // If any part is False then entire thing is False
          if (!countBool) {
            break;
          }
        }

        // Get new current boolean
        currBool = handleOperatorInModifier(
          currBool,
          negate !== countBool,
          operator,
          'count modifier'
        );

        // If currBool is False and the rest of the tree are and (which should be common), then return False directly
        if (!currBool) {
          // Try to find any or operators
          if (!modifierTree.some((part) => part === '||')) {
            // Don't find any other '||', therefore all ands or near the end and can simply return False
            return false;
          }
        }

        // Clear the operator
        operator = '';
      }
      // Before modifier
      else {
        const beforeModifierMatchObj = newModifierPart.match(
          /^([\[\]TILJSZO*]+)<([\[\]TILJSZO*]+)$/
        );
        if (beforeModifierMatchObj) {
          // Get the before and after pieces
          const beforePieces = beforeModifierMatchObj[1];
          const afterPieces = beforeModifierMatchObj[2];

          // Separate any set notation
          const beforePiecesParts = beforePieces.split(/(\[[TILJSZO*]+\])/).filter(Boolean);
          const afterPiecesParts = afterPieces.split(/(\[[TILJSZO*]+\])/).filter(Boolean);

          let beforeBool = true;
          for (const bPart of beforePiecesParts) {
            for (const aPart of afterPiecesParts) {
              // Get the boolean for if the queue does match the before modifier
              beforeBool = handleBeforeOperator(bPart, aPart, subQueue);

              // If any part is False then entire thing is False
              if (!beforeBool) {
                break;
              }
            }
          }

          // Get new current boolean
          currBool = handleOperatorInModifier(
            currBool,
            negate !== beforeBool,
            operator,
            'before modifier'
          );

          // If currBool is False and the rest of the tree are and (which should be common), then return False directly
          if (!currBool) {
            // Try to find any or operators
            if (!modifierTree.some((part) => part === '||')) {
              // Don't find any other '||', therefore all ands or near the end and can simply return False
              return false;
            }
          }

          // Clear the operator
          operator = '';
        }
        // Regex modifier
        else {
          const regexModifierMatchObj = newModifierPart.match(/\/(.+)\//);
          if (regexModifierMatchObj) {
            // Get the negate and regex pattern
            const regexPattern = regexModifierMatchObj[1];

            // Get the boolean for if the queue matches the regex pattern
            const regexBool = negate !== new RegExp(regexPattern).test(subQueue);

            // Get new current boolean
            currBool = handleOperatorInModifier(currBool, regexBool, operator, 'regex modifier');

            // If currBool is False and the rest of the tree are and (which should be common), then return False directly
            if (!currBool) {
              // Try to find any or operators
              if (!modifierTree.some((part) => part === '||')) {
                // Don't find any other '||', therefore all ands or near the end and can simply return False
                return false;
              }
            }

            // Clear the operator
            operator = '';
          }
          // Handle operator
          else if (modifierPart === '&&' || modifierPart === '||') {
            operator = modifierPart;
          } else {
            // Something went wrong
            throw new Error(
              'Something went wrong when parsing leading to no match to modifiers or operator'
            );
          }
        }
      }
    } else {
      // Something went wrong
      throw new Error(
        "Something went wrong leading to some modifier that isn't a string or list in the modifier tree"
      );
    }
  }

  // Return the boolean
  return currBool;
}

// Handle the whole extended sfinder pieces
function handleExtendedSfinderFormatPieces(
  extendedSfinderFormatPieces: string,
  sortQueuesBool: boolean = true,
  index: number = 0,
  depth: number = 0
): [Iterable<string>, number] {
  /** Handle the whole extended sfinder pieces */

  // Delimiter between parts
  const delimiter = ',';

  // Holds a list of the queues for each part
  const queues: Iterable<string>[] = [];

  // Holds a stack of queues as parsing through the expression
  const queueStack: Iterable<string>[] = [];

  // Go through each character
  let sfinderPieces = '';
  while (index < extendedSfinderFormatPieces.length) {
    const char = extendedSfinderFormatPieces[index];

    // Delimiter
    if (char === delimiter) {
      // All the sfinder pieces so far
      if (sfinderPieces) {
        queueStack.push(parseInput(sfinderPieces));
        sfinderPieces = '';
      }

      // Do the product of each part for one long queue
      let queuesPart: Iterable<string>;
      if (queueStack.length === 1) {
        queuesPart = queueStack[0];
      } else {
        queuesPart = cartesianProduct(...queueStack).map((arr) => arr.join(''));
      }

      queues.push(queuesPart);

      // Empty stack
      queueStack.length = 0;
    }
    // Sub expression
    else if (char === '(') {
      // Add the sfinder pieces so far
      if (sfinderPieces) {
        queueStack.push(parseInput(sfinderPieces));
        sfinderPieces = '';
      }

      // Run recursive for expressions in parentheses
      const [subQueue, newIndex] = handleExtendedSfinderFormatPieces(
        extendedSfinderFormatPieces,
        false,
        index + 1,
        depth + 1
      );

      // Add this sub queue to the stack
      queueStack.push(subQueue);
      index = newIndex;
    } else if (char === ')') {
      // All the sfinder pieces so far
      if (sfinderPieces) {
        queueStack.push(parseInput(sfinderPieces));
      }

      // Combine everything in the stack
      queues.push(cartesianProduct(...queueStack).map((arr) => arr.join('')));

      // Combine all the queues so far
      const result = cartesianProduct(...queues).map((arr) => arr.join(''));

      // Return the queues and index
      return [result, index];
    }
    // Handle modifier
    else if (char === '{') {
      // All the sfinder pieces so far
      if (sfinderPieces) {
        queueStack.push(parseInput(sfinderPieces));
        sfinderPieces = '';
      }

      // Make the modifier tree
      const [modifierTree, modifierLength] = makeModifierTree(
        extendedSfinderFormatPieces.slice(index + 1),
        0,
        0,
        true
      ) as [ModifierTree, number];

      // If the length makes it the entire string
      if (index + modifierLength + 1 === extendedSfinderFormatPieces.length) {
        throw new Error(`Modifier didn't close '${extendedSfinderFormatPieces.slice(index)}'`);
      }

      // Get the queues from combining the stack
      let queuesPart = cartesianProduct(...queueStack).map((arr) => arr.join(''));

      // Filter the queues with the modifier tree
      queuesPart = [...queuesPart].filter((q) => checkModifier(q, modifierTree));

      // Set the stack with just this part
      queueStack.length = 0;
      queueStack.push(queuesPart);

      // Move index
      index += modifierLength + 1;
    }
    // Normal sfinder pieces
    else if (!WHITESPACE.has(char)) {
      sfinderPieces += char;
    }

    // Increment index
    index += 1;
  }

  // If there's any more sfinder pieces at the end
  if (sfinderPieces) {
    queues.push(parseInput(sfinderPieces));
  }

  // Do the product of each part for one long queue
  let queuesPart = cartesianProduct(...queueStack).map((arr) => arr.join(''));

  // Add this last part to the queues
  queues.push(queuesPart);

  // Do the product of each part for one long queue
  let result = cartesianProduct(...queues).map((arr) => arr.join(''));

  // Sort the queues
  if (sortQueuesBool) {
    result = sortQueues(result);
  }

  // Return the queues as a generator object
  return [result, index];
}

// Handle user input and runs the program
function extendPieces(customInput: string | string[] = process.argv.slice(2)): string[] {
  /** Main function for handling user input and program */

  if (typeof customInput === 'string') {
    customInput = [customInput];
  }

  // Get the user input
  const userInput = customInput;

  // Splitting to get the extended sfinder format pieces
  const allExtendedSfinderPieces: string[] = [];
  for (const argument of userInput) {
    allExtendedSfinderPieces.push(...argument.split(/\n|;/));
  }

  // Hold all the queues parts
  const queues: Iterable<string>[] = [];

  // Go through part of the user input that's a extended sfinder format pieces
  for (const extendedSfinderPieces of allExtendedSfinderPieces) {
    // Get the queues from this format
    const [queuesPart] = handleExtendedSfinderFormatPieces(extendedSfinderPieces, false);
    queues.push(queuesPart);
  }

  // Sort the queues
  const result = sortQueues([...new Set(queues.flatMap((q) => [...q]))]);

  // Return the queues generator obj
  return result;
}

// Export the main function
export { extendPieces };
