<script lang="ts">
  import type { SubmitFunction } from './$types';
  import { onMount } from 'svelte';
  import { enhance } from '$app/forms';
  import { PCSIZE, BOARDHEIGHT } from '$lib/constants';
  import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
  import { get_colour, PieceEnum, Rotation } from '$lib/tetris/pieceData';
  import { TetrisQueue } from '$lib/tetris/TetrisQueue';
  import { TetrisBoard } from '$lib/tetris/TetrisBoard';
  import { TetrisSetupQuiz, type SetupQuizMode } from '$lib/tetris/TetrisSetupQuiz';
  import { decodeWrapper } from '$lib/utils/fumenUtils';
  import { SvelteSet } from 'svelte/reactivity';
  import { type Action, keybinds } from '$lib/tetris/Keybind';
  import type { Fumen, Piece } from '$lib/types';
  import { toast } from 'svelte-sonner';

  export let data;

  let gameCtn: HTMLDivElement;
  let boardCanvas: HTMLCanvasElement, queueCanvas: HTMLCanvasElement, holdCanvas: HTMLCanvasElement;
  let patternsText = '';
  let game: TetrisSetupQuiz;
  let actions: SvelteSet<Action> = new SvelteSet<Action>();
  let showSettings: boolean = false;
  let currMode: SetupQuizMode = 'practice';

  let errorMessage = '';

  let quizAllowSolve = false;

  let showAnswer = false;

  const modesTips: { mode: SetupQuizMode; tooltip: string }[] = [
    { mode: 'pure', tooltip: 'Pure is normal Tetris without undos' },
    { mode: 'practice', tooltip: 'Practice enables undos' },
    { mode: 'setup quiz', tooltip: 'Setup quiz requires building the correct setup for the queue' }
  ];

  const presets = data.presets;

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
      game = new TetrisSetupQuiz(patternsText);
      game.mode = currMode;
    } catch (e) {
      toast.error('Invalid pattern for queue: ' + (e as Error).message);
      console.error(e);
      game = new TetrisSetupQuiz();
    }

    game.loadHandling();

    let frame: DOMHighResTimeStamp;
    const loop = (timestamp: number) => {
      game.tick(timestamp, actions);
      let tmpActions = new SvelteSet<Action>();
      if (actions.has('left')) tmpActions.add('left');
      if (actions.has('right')) tmpActions.add('right');
      if (actions.has('sd')) tmpActions.add('sd');
      actions = tmpActions;

      handleEvents();

      drawGame(boardCtx, game);
      drawQueue(queueCtx, game.queue);
      drawHold(holdCtx, game.holdPiece);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(frame); // Cleanup on destroy
  });

  function handleKeyDown(event: KeyboardEvent) {
    if (event.code == 'KeyZ' && event.ctrlKey) actions.add('undo');
    else actions.add(keybinds.lookup[event.code]);
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
      game.setPractice(patternsText);
    } catch (e) {
      toast.error('Invalid pattern for queue: ' + (e as Error).message);
      console.error(e);
    }
  }

  function handleEvents() {
    for (let event of game.pendingEvents) {
      switch (event) {
        case 'correct':
          showAnswer = false;
          toast.message('Correct!');
          break;
        case 'wrong':
          toast.message('Wrong!');
          break;
        case 'missing setup':
          toast.warning('No setup found in json for this queue. Restart to continue');
          break;
      }
    }
    game.pendingEvents = [];

    // set mode back to game
    game.mode = currMode;
    game.allowSolving = quizAllowSolve;
  }

  function drawGame(context: CanvasRenderingContext2D, game: TetrisSetupQuiz) {
    drawBoard(context, game.board);
    drawPiece(context, game.active);

    if (showAnswer && game.runningCorrectSetup !== null) {
      drawFumen(context, game.runningCorrectSetup, '4D', game.board);
    }

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

    if (document.activeElement !== gameCtn) {
      drawOOF(context);
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
      drawPiece(
        context,
        new TetrisBoardPiece(1 + shiftX, 12 - 3 * i + shiftY, preview[i], Rotation.spawn)
      );
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

  function drawFumen(
    context: CanvasRenderingContext2D,
    fumen: Fumen,
    opacity: string = '',
    board: TetrisBoard | null = null
  ) {
    const page = decodeWrapper(fumen)[0];
    const field = page.field.str({ reduced: true, garbage: false }).split('\n').toReversed();
    for (let row = 0; row < field.length; row++) {
      for (let col = 0; col < PCSIZE; col++) {
        if (board !== null && board.isFilled(row, col)) {
          continue;
        }
        const cell = field[row][col];
        const index = cell == '_' ? PieceEnum.X : PieceEnum[cell as Piece];

        context.fillStyle = get_colour(index) + opacity;
        context.fillRect(col, row, 1, 1);
      }
    }
  }

  function drawOOF(context: CanvasRenderingContext2D) {
    let transform = context.getTransform();
    context.resetTransform();
    context.font = `bold ${CELL_SIZE + 5}px Arial`;
    context.fillStyle = 'rgba(235, 203, 139, 0.7)';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText('OUT OF FOCUS', context.canvas.width / 2, context.canvas.height / 2);
    context.setTransform(transform);
  }

  function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;

    // Reset states on a new attempt
    errorMessage = '';

    if (!files || files.length === 0) return;

    const file = files[0];

    // Validation
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      errorMessage = 'Please upload a valid .json file.';
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonString = e.target?.result as string;
        const parsedData = JSON.parse(jsonString);

        currMode = 'setup quiz';
        game.getSetupData(parsedData.setups, parsedData.tree, parsedData.pattern);
        patternsText = parsedData.pattern;
      } catch (err) {
        console.error(err);
        errorMessage = 'Failed to parse JSON. Check file formatting.';
      }
    };

    reader.readAsText(file);
  }

  const handlePreset: SubmitFunction = () => {
    return async ({ result, update }) => {
      if (result.type !== 'success') {
        update();
        return;
      }

      const parsedData = result.data?.coverSet;

      currMode = 'setup quiz';
      game.getSetupData(parsedData.setups, parsedData.tree, parsedData.pattern);
      patternsText = parsedData.pattern;
    };
  };
</script>

<svelte:window />

<div>
  <div
    class="container mx-auto grid grid-rows-1 grid-rows[auto_1fr] xl:grid-cols-1 xl:grid-cols-[1fr_auto_1fr]"
  >
    <div class="hidden lg:block"></div>
    <div class="relative z-1 flex flex-col items-center">
      <div
        bind:this={gameCtn}
        class="game-container flex items-start p-4"
        on:keydown={handleKeyDown}
        on:keyup={handleKeyUp}
        tabindex="0"
        aria-label="Tetris game"
        role="button"
      >
        <canvas bind:this={holdCanvas} id="hold" class="rounded bg-[#2e3440] px-2 py-4"></canvas>
        <canvas bind:this={boardCanvas} id="board" class="mx-1 rounded border-0 bg-[#2e3440]"
        ></canvas>

        <div class="flex flex-col gap-2">
          <div>
            <canvas bind:this={queueCanvas} id="queue" class="rounded bg-[#2e3440] px-2 py-4"
            ></canvas>
          </div>
          <button
            class="btn bg-base-300 border-base-content"
            on:click={() => (showAnswer = !showAnswer)}>Show Answer</button
          >
        </div>
      </div>

      <label for="pattern"
        >Pattern for Queue <a
          class="font-bold text-blue-500"
          href="https://github.com/Marfung37/ExtendedSfinderPieces">?</a
        ></label
      >
      <textarea id="pattern" class="bg-base-300" bind:value={patternsText}></textarea>
      <button class="btn bg-base-300 border-base-content" on:click={handleGenerate}>Generate</button
      >

      <button class="btn bg-base-300 border-base-content" on:click={() => (showSettings = true)}
        >Show Settings</button
      >

      <div class="upload-container">
        <input
          type="file"
          id="json-file"
          accept=".json"
          on:change={handleFileChange}
          class="hidden"
        />

        <label for="json-file" class="btn bg-base-300 border-base-content">
          Upload Setup Quiz JSON
        </label>

        {#if errorMessage}
          <p class="error">{errorMessage}</p>
        {/if}
      </div>
    </div>

    <div class="flex flex-col gap-2 items-center">
      <h3 class="text-xl">Modes</h3>
      <div class="flex gap-4">
        {#each modesTips as modetip (modetip.mode)}
          <div class="tooltip">
            <span class="tooltip-content">
              {modetip.tooltip}
            </span>
            <label>
              <input type="radio" class="radio" value={modetip.mode} bind:group={currMode} />
              {modetip.mode}
            </label>
          </div>
        {/each}
      </div>

      <h3 class="text-xl">Presets</h3>
      <form method="POST" action="?/quizPreset" use:enhance={handlePreset}>
        <select name="preset">
          {#each presets as preset (preset.name)}
            <option value={preset.filename}>{preset.name}</option>
          {/each}
        </select>
        <button type="submit" class="btn">Submit</button>
      </form>

      <label>
        <input class="checkbox" type="checkbox" bind:checked={quizAllowSolve} />
        Allow Solving in Quiz
      </label>
    </div>
  </div>

  {#if showSettings}
    <div
      id="settings-modal"
      class="fixed top-0 left-0 z-99 flex h-full w-full items-center justify-center bg-gray-400/50"
      on:click|self={() => {
        showSettings = false;
        game.saveHandling();
      }}
      role="button"
      aria-label="Close keybind dialog"
      tabindex="0"
      on:keydown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') showSettings = false;
      }}
    >
      <div class="flex h-7/8 w-auto flex-col justify-evenly rounded bg-white px-6 py-2">
        <div>
          <h3 class="py-2 text-lg font-bold">Keybinds</h3>
          <table>
            <tbody>
              {#each Object.entries($keybinds || {}) as [action, key] (action)}
                <tr>
                  <td class="px-2">{action}</td>
                  <td>
                    <input
                      class="text-sm caret-transparent disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-700"
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
            {#each ['das', 'arr', 'sdArr'] as tuning (tuning)}
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
