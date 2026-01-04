<script lang='ts'>
  import { onMount } from 'svelte';
  import { PCSIZE, BOARDHEIGHT } from '$lib/constants';
  import { TetrisBoardPiece } from '$lib/tetris/TetrisBoardPiece';
  import { get_colour, PieceEnum, Rotation } from '$lib/tetris/pieceData';
  import { TetrisQueue } from '$lib/tetris/TetrisQueue';
  import { TetrisBoard } from '$lib/tetris/TetrisBoard';
  import { TetrisGame } from '$lib/tetris/TetrisGame';
  import { type Action, keybinds } from '$lib/tetris/Keybind';
  import { toast } from 'svelte-sonner';

  let boardCanvas: HTMLCanvasElement, queueCanvas: HTMLCanvasElement, holdCanvas: HTMLCanvasElement;
  let patternsText = "";
  let game: TetrisGame, actions: Set<Action> = new Set<Action>();

  const CELL_SIZE = 25;

  onMount(() => {
    keybinds.reset(keybinds.load());

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

    game = new TetrisGame(patternsText.toUpperCase());
    game.loadHandling();

    let frame: DOMHighResTimeStamp;
    const loop = (timestamp: number) => {
      game.tick(timestamp, actions);
      drawGame(boardCtx, game);
      drawQueue(queueCtx, game.queue);
      drawHold(holdCtx, game.holdPiece);
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    
    return () => cancelAnimationFrame(frame); // Cleanup on destroy
  });

  function handleKeyDown(event: KeyboardEvent) {
    actions.add(keybinds.lookup[event.code]);
    // You can also stop scrolling with space/arrows here
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
      event.preventDefault();
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    actions.delete(keybinds.lookup[event.code]);
  }

  function handleGenerate() {
    try {
      game = new TetrisGame(patternsText.toUpperCase());
    } catch (e) { /* handle error */ }
  }

  function drawGame(context: CanvasRenderingContext2D, game: TetrisGame) {
    drawBoard(context, game.board);
    drawPiece(context, game.active);

    // Ghost
    drawPiece(context, game.getGhost(), "4D");
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
    context.strokeStyle = "#ffffff0E";
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
    // let game_div = document.getElementById("game");
    // if (!(document.activeElement === game_div)) {
    //   draw_oof(context);
    // }
  }

  function drawQueue(context: CanvasRenderingContext2D, queue: TetrisQueue) {
    context.fillStyle = get_colour(PieceEnum.X);
    context.fillRect(0, 0, 4, 14);
    let preview = queue.preview();
    for (let i = 0; i < Math.min(preview.length, 5); i++) {
      drawPiece(context, new TetrisBoardPiece(1, 12 - 3 * i, preview[i], Rotation.spawn));
    }
  }

  function drawHold(context: CanvasRenderingContext2D, hold: PieceEnum) {
    context.fillStyle = get_colour(PieceEnum.X);
    context.fillRect(0, 0, 4, 2);

    if (hold != PieceEnum.X) {
      context.fillStyle = get_colour(hold);
      drawPiece(context, new TetrisBoardPiece(1, 0, hold, Rotation.spawn));
    }
  }

  function drawPiece(context: CanvasRenderingContext2D, piece: TetrisBoardPiece, opacity: string = '') {
    if (opacity === undefined) {
      opacity = "";
    }
    for (let {x, y} of piece.getMinos()) {
      context.fillStyle = get_colour(piece.type) + opacity;
      context.fillRect(x, y, 1, 1);
    }
  }
</script>

<svelte:window 
  on:keydown={handleKeyDown} 
  on:keyup={handleKeyUp} 
/>

<div class="flex flex-col items-center">
  <div class="game-container">
    <canvas bind:this={holdCanvas} id="hold" class="inline-block"></canvas>
    <canvas bind:this={boardCanvas} id="board" class="inline-block"></canvas>
    
    <canvas bind:this={queueCanvas} id="queue" class="inline-block"></canvas>
    
    <textarea bind:value={patternsText}></textarea>
    <button on:click={handleGenerate}>Generate</button>
  </div>

  <h3>Keybinds</h3>
  <table>
    <tbody>
    {#each Object.entries($keybinds || {}) as [action, key]}
      <tr>
        <td>{action}</td>
        <td>
          <input 
            value={key} 
            on:keydown|preventDefault|stopPropagation={(e) => {keybinds.set(action as Action, e.code); keybinds.save();}} 
          />
        </td>
      </tr>
    {/each}
    </tbody>
  </table>


  {#if game !== undefined}
  <h3>Tunings</h3>
  {#each ['das', 'arr', 'sdArr'] as tuning}
    <label for={tuning}>{tuning}</label>
    <input 
      id={tuning}
      type="number" 
      value={game.handling[tuning]}
      on:change={(e) => {
        game.handling[tuning] = Number((e.target as HTMLInputElement).value);
        game.saveHandling();
        toast.success(tuning + ' changed!');
      }}
    />
  {/each}
  {/if}
</div>
