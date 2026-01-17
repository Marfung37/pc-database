<script lang="ts">
  import { onMount } from 'svelte';
  import { PCSIZE, BOARDHEIGHT } from '$lib/constants';
  import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
  import { get_colour, PieceEnum, Rotation } from '$lib/tetris/pieceData';
  import { TetrisQueue } from '$lib/tetris/TetrisQueue';
  import { TetrisBoard } from '$lib/tetris/TetrisBoard';
  import { TetrisGame } from '$lib/tetris/TetrisGame';
  import { type Action, keybinds } from '$lib/tetris/Keybind';
  import { toast } from 'svelte-sonner';

  let gameCtn: HTMLDivElement;
  let boardCanvas: HTMLCanvasElement, queueCanvas: HTMLCanvasElement, holdCanvas: HTMLCanvasElement;
  let patternsText = '';
  let game: TetrisGame,
    actions: Set<Action> = new Set<Action>();
  let showSettings: boolean = false;

  const CELL_SIZE = 24;

  onMount(() => {
    let oldKeybinds = keybinds.load();
    if (Object.keys(oldKeybinds).length !== 0) keybinds.reset(oldKeybinds);

    boardCanvas.width = PCSIZE * CELL_SIZE;
    boardCanvas.height = BOARDHEIGHT * CELL_SIZE;
    queueCanvas.width = 4 * CELL_SIZE;
    queueCanvas.height = 14 * CELL_SIZE;
    holdCanvas.width = 4 * CELL_SIZE;
    holdCanvas.height = 2 * CELL_SIZE;

    const boardCtx = boardCanvas.getContext('2d')!;
    const queueCtx = queueCanvas.getContext('2d')!;
    const holdCtx = holdCanvas.getContext('2d')!;

    // Set origin to bottom left
    holdCtx.setTransform(CELL_SIZE, 0, 0, -CELL_SIZE, 0, 2 * CELL_SIZE);
    boardCtx.setTransform(CELL_SIZE, 0, 0, -CELL_SIZE, 0, 20 * CELL_SIZE);
    queueCtx.setTransform(CELL_SIZE, 0, 0, -CELL_SIZE, 0, 14 * CELL_SIZE);

    try {
      game = new TetrisGame(patternsText);
    } catch (e) {
      toast.error('Invalid pattern for queue: ' + (e as Error).message);
      console.error(e);
      game = new TetrisGame();
    }

    game.loadHandling();

    let frame: DOMHighResTimeStamp;
    const loop = (timestamp: number) => {
      game.tick(timestamp, actions);
      let tmpActions = new Set<Action>();
      if(actions.has("left")) tmpActions.add("left");
      if(actions.has("right")) tmpActions.add("right");
      if(actions.has("sd")) tmpActions.add("sd");
      actions = tmpActions;

      drawGame(boardCtx, game);
      drawQueue(queueCtx, game.queue);
      drawHold(holdCtx, game.holdPiece);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame); // Cleanup on destroy
  });

  function handleKeyDown(event: KeyboardEvent) {
    if(event.code == "KeyZ" && event.ctrlKey)
      actions.add("undo");
    else
      actions.add(keybinds.lookup[event.code]);
    // You can also stop scrolling with space/arrows here
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      event.preventDefault();
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    actions.delete(keybinds.lookup[event.code]);
  }

  function handleGenerate() {
    try {
      game = new TetrisGame(patternsText, game.handling);
    } catch (e) {
      toast.error('Invalid pattern for queue: ' + (e as Error).message);
      console.error(e);
    }
  }

  function drawGame(context: CanvasRenderingContext2D, game: TetrisGame) {
    drawBoard(context, game.board);
    drawPiece(context, game.active);

    // Ghost
    drawPiece(context, game.getGhost(), '4D');
  }

  function drawBoard(context: CanvasRenderingContext2D, board: TetrisBoard) {
    context.fillStyle = get_colour(0);
    context.fillRect(0, 0, PCSIZE, BOARDHEIGHT);

    // Grid
    context.beginPath();
    for (let x = 1; x < PCSIZE; x++) {
      context.moveTo(x, 0);
      context.lineTo(x, 20);
    }
    for (let y = 1; y < BOARDHEIGHT; y++) {
      context.moveTo(0, y);
      context.lineTo(10, y);
    }
    let transform = context.getTransform();
    context.resetTransform();
    context.strokeStyle = '#ffffff0E';
    context.lineWidth = 1;
    context.stroke();
    context.setTransform(transform);

    // Minos
    for (let y = 0; y < BOARDHEIGHT; y++) {
      for (let x = 0; x < PCSIZE; x++) {
        if (board.isFilled(y, x)) {
          context.fillStyle = get_colour(board.at(y, x));
          context.fillRect(x, y, 1, 1);
        }
      }
    }

    if(document.activeElement !== gameCtn) {
      drawOOF(context)
    }
  }

  function drawQueue(context: CanvasRenderingContext2D, queue: TetrisQueue) {
    context.fillStyle = get_colour(PieceEnum.X);
    context.fillRect(0, 0, 4, 14);
    let preview = queue.preview();
    for (let i = 0; i < Math.min(preview.length, 5); i++) {
      let shiftX = 0;
      let shiftY = 0;
      if (preview[i] != PieceEnum.I && preview[i] != PieceEnum.O) {
        shiftX = 0.5;
      }
      if (preview[i] == PieceEnum.I) {
        shiftY = 0.5;
      }
      drawPiece(context, new TetrisBoardPiece(1 + shiftX, 12 - 3 * i + shiftY, preview[i], Rotation.spawn));
    }
  }

  function drawHold(context: CanvasRenderingContext2D, hold: PieceEnum) {
    context.fillStyle = get_colour(PieceEnum.X);
    context.fillRect(0, 0, 4, 2);

    if (hold != PieceEnum.X) {
      let shiftX = 0;
      let shiftY = 0;
      if (hold != PieceEnum.I && hold != PieceEnum.O) {
        shiftX = 0.5;
      }
      if (hold == PieceEnum.I) {
        shiftY = 0.5;
      }

      context.fillStyle = get_colour(hold);
      drawPiece(context, new TetrisBoardPiece(1 + shiftX, shiftY, hold, Rotation.spawn));
    }
  }

  function drawPiece(
    context: CanvasRenderingContext2D,
    piece: TetrisBoardPiece,
    opacity: string = ''
  ) {
    if (piece.type === PieceEnum.X) return;
    if (opacity === undefined) {
      opacity = '';
    }
    for (let { x, y } of piece.getMinos()) {
      context.fillStyle = get_colour(piece.type) + opacity;
      context.fillRect(x, y, 1, 1);
    }
  }

  function drawOOF(context: CanvasRenderingContext2D) {
    let transform = context.getTransform();
    context.resetTransform();
    context.font = `bold ${CELL_SIZE + 5}px Arial`;
    context.fillStyle = "rgba(235, 203, 139, 0.7)";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
        "OUT OF FOCUS",
        context.canvas.width / 2,
        context.canvas.height / 2,
    );
    context.setTransform(transform);
  }
</script>

<div class="flex flex-col items-center">
  <div bind:this={gameCtn} class="game-container flex items-start" on:keydown={handleKeyDown} on:keyup={handleKeyUp} tabindex="0" aria-label="Tetris game" role="button">
    <canvas bind:this={holdCanvas} id="hold" class="bg-[#2e3440] px-2 py-4 rounded"></canvas>
    <canvas bind:this={boardCanvas} id="board" class="mx-1 bg-[#2e3440] border-0 rounded"></canvas>

    <canvas bind:this={queueCanvas} id="queue" class="bg-[#2e3440] px-2 py-4 rounded"></canvas>
  </div>

  <label for="pattern"
    >Pattern for Queue <a
      class="font-bold text-blue-500"
      href="https://github.com/Marfung37/ExtendedSfinderPieces">?</a
    ></label
  >
  <textarea id="pattern" bind:value={patternsText}></textarea>
  <button class="btn" on:click={handleGenerate}>Generate</button>

  <button class="btn" on:click={() => (showSettings = true)}>Show Settings</button>

  {#if showSettings}
    <div
      id="settings-modal"
      class="fixed top-0 left-0 z-1 flex h-full w-full items-center justify-center bg-gray-400/50"
      on:click|self={() => {
        showSettings = false
        game.saveHandling();
      }}
      role="button"
      aria-label="Close keybind dialog"
      tabindex="0"
      on:keydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') showSettings = false;
      }}
    >
      <div class="flex flex-col justify-evenly rounded bg-white py-2 px-6 h-7/8 w-auto">
        <div>
        <h3 class="py-2 text-lg font-bold">Keybinds</h3>
        <table>
          <tbody>
            {#each Object.entries($keybinds || {}) as [action, key]}
              <tr>
                <td class="px-2">{action}</td>
                <td>
                  <input
                    class={"text-sm caret-transparent disabled:bg-slate-200 disabled:text-slate-700 disabled:cursor-not-allowed"}
                    value={key}
                    on:keydown|preventDefault|stopPropagation={(e) => {
                      keybinds.set(action as Action, e.code);
                      keybinds.save();
                    }}
                    readonly
                    disabled={action == 'undo'}
                  />
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
        </div>

        <div>
        {#if game !== undefined}
          <h3 class="py-2 text-lg font-bold">Tunings</h3>
          {#each ['das', 'arr', 'sdArr'] as tuning}
            <div class="flex justify-between">
            <label for={tuning}>{tuning}</label>
            <input
              class="text-sm"
              id={tuning}
              type="number"
              value={game.handling[tuning]}
              on:change={(e) => {
                game.handling[tuning] = Number((e.target as HTMLInputElement).value);
                game.saveHandling();
                toast.success(tuning + ' changed!');
              }}
            />
            </div>
          {/each}
        {/if}
        </div>
      </div>
    </div>
  {/if}
</div>
