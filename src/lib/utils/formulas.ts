/**
 * Converts a given PC (Perfect Clear) number to the length of the leftover.
 *
 * @param pcNum - A PC number in the range 1-9.
 * @returns The length of the leftover in the range 1-7.
 */
export function PCNUM2LONUM(pcNum: number): number {
    // The formula for converting PC number to leftover length.
    // The result is modulo 7 and then adjusted to be in the range 1-7.
    return ((pcNum * 4) + 2) % 7 + 1;
}

/**
 * Converts a given length of leftover to a PC (Perfect Clear) number.
 *
 * @param leftoverNum - The length of the leftover in the range 1-7.
 * @returns A PC number in the range 1-7.
 */
export function LONUM2PCNUM(leftoverNum: number): number {
    // The formula for converting leftover length to PC number.
    // The result is modulo 7 and then adjusted to be in the range 1-7.
    return (leftoverNum * 2) % 7 + 1;
}

/**
 * Generates the bag composition for a Perfect Clear (PC) setup,
 * aiming for a total of 11 pieces.
 *
 * @param leftoverNum - The length of the leftover in the range 1-7.
 * @returns A list of numbers representing the composition of pieces in each bag
 * to reach the 11-piece target.
 */
export function LONUM2BAGCOMP(leftoverNum: number): number[] {
    // Initialize the bag composition with the given leftover number.
    const bagComp: number[] = [leftoverNum];

    // Continue adding bags until the total number of pieces reaches or exceeds 11.
    while (bagComp.reduce((sum, current) => sum + current, 0) < 11) {
        // Calculate remaining pieces needed to reach 11.
        const remainingNeeded = 11 - bagComp.reduce((sum, current) => sum + current, 0);
        // Add either the remaining needed pieces or a full bag (7 pieces), whichever is smaller.
        bagComp.push(Math.min(remainingNeeded, 7));
    }

    return bagComp;
}

/**
 * Computes the PC (Perfect Clear) number based on the number of pieces placed
 * and the number of minos already on the board.
 *
 * Undefined behavior may occur if 'minos' is an odd number, as the underlying
 * logic assumes 'minos' represents a number of blocks that can be formed by
 * Tetris pieces (which are typically 4 minos per piece, leading to even totals).
 *
 * @param pieces - The number of pieces placed.
 * @param [minos=0] - The number of minos already on the board (default is 0 for an empty board).
 * @returns A PC number in the range 1-7.
 */
export function PCNUM(pieces: number, minos: number = 0): number {
    // Simplify calculations by taking modulo 7 for the number of pieces.
    const piecesMod7 = pieces % 7;

    // Calculate the effective number of pieces placed onto the board based on minos.
    const minosToPieces = 3 * (minos % 4) + 2 * (minos % 7);

    // Calculate the effective number of total pieces.
    const effectivePieces = (piecesMod7 - minosToPieces) % 7;

    // Ensure effectivePieces is non-negative after modulo operation.
    const normalizedEffectivePieces = (effectivePieces + 7) % 7;

    // Compute the final PC number.
    const pcNum = (5 * normalizedEffectivePieces) % 7 + 1;

    return pcNum;
}
