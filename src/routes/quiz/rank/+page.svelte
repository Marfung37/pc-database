<script lang='ts'>
  import { m } from '$lib/paraglide/messages.js';
  import SetupInfo from '$lib/components/SetupInfo.svelte';

  const pcs = [
    { id: 1, pc: '1st' },
    { id: 2, pc: '2nd' },
    { id: 3, pc: '3rd' },
    { id: 4, pc: '4th' },
    { id: 5, pc: '5th' },
    { id: 6, pc: '6th' },
    { id: 7, pc: '7th' },
    { id: 8, pc: '8th' },
    { id: 9, pc: '9th' }
  ];

  type Phase = 'intro' | 'filter' | 'rank-intro' | 'rank' | 'results';
  let phase: Phase = 'intro';

  let pile: string[][] = [];
  pile.push(Array.from({length: 26}, (_, i) => String.fromCharCode(97 + i)).reverse());
  pile.push(Array.from({length: 10}, (_, i) => i.toString()).reverse());
  let keepPile: string[][] = [[]];
  let discardPile: string[][] = [[]];

  let left = false;
  let right = false;
  let groupIndex = 0;

  type RankableItem = string; 

  interface ComparisonState {
    a: RankableItem;
    b: RankableItem;
    resolve: (value: RankableItem) => void;
  }

  let currentComparison: ComparisonState | null = null;
  let rankedList: RankableItem[][] = [];
  let currentStep = 0;
  let totalSteps = 0;

  function handleKeyDown(event: KeyboardEvent) {
    if (phase == 'filter' && pile.length == 0) return;

    if (event.code == 'ArrowLeft' && !left) {
      left = true;
      if (phase == 'filter') {
        keepPile[groupIndex].push(pile[groupIndex].pop()!)
        pile = pile;
        keepPile = keepPile;
      }
      if (phase == 'rank') {
        currentComparison?.resolve(currentComparison.a);
      }
    }
    if (event.code == 'ArrowRight' && !right) {
      right = true;
      if (phase == 'filter') {
        discardPile[groupIndex].push(pile[groupIndex].pop()!)
        pile = pile;
        discardPile = discardPile;
      }
      if (phase == 'rank') {
        currentComparison?.resolve(currentComparison.b);
      }
    }
    if (pile[groupIndex].length == 0) {
      keepPile.push([]);
      discardPile.push([]);
      groupIndex++;
    }

  } 

  function handleKeyUp(event: KeyboardEvent) {
    if (event.code == 'ArrowLeft') left = false;
    if (event.code == 'ArrowRight') right = false;
  } 

  async function humanCompare(a: RankableItem, b: RankableItem) {
    return new Promise((resolve) => {
      currentComparison = { 
        a, 
        b, 
        resolve: (winner) => {
          currentStep++;
          resolve(winner);
        }
      };
    });
  }

  async function mergeSort(arr: RankableItem[]): Promise<RankableItem[]> {
    if (arr.length <= 1) return arr;

    const middle = Math.floor(arr.length / 2);
    const left = await mergeSort(arr.slice(0, middle));
    const right = await mergeSort(arr.slice(middle));

    return await merge(left, right);
  }

  async function merge(left: RankableItem[], right: RankableItem[]): Promise<RankableItem[]> {
    let result: RankableItem[] = [];
    const initialPotential = left.length + right.length - 1;
    let actualComparisonsInThisMerge = 0;

    while (left.length && right.length) {
      actualComparisonsInThisMerge++;
      const winner = await humanCompare(left[0], right[0]);
      
      if (winner === left[0]) {
        result.push(left.shift()!);
      } else {
        result.push(right.shift()!);
      }
    }

    const savedClicks = initialPotential - actualComparisonsInThisMerge;
    totalSteps -= savedClicks;

    return [...result, ...left, ...right];
  }

  function estimateTotal(arr: RankableItem[]): number {
    if (arr.length <= 1) return 0;
    const middle = Math.floor(arr.length / 2);
    const left = arr.slice(0, middle);
    const right = arr.slice(middle);
    
    // Current merge max + recursive maxes
    return (left.length + right.length - 1) + estimateTotal(left) + estimateTotal(right);
  }

  async function startRanking() {
    currentStep = 0;
    totalSteps = 0;
    for (let group of keepPile) {
      totalSteps += estimateTotal(group);
    }
    for (let group of keepPile) {
      rankedList.push(await mergeSort(group));
    }
    currentComparison = null; 
    phase = 'results';
  };
</script>

<style>
  .grid-area-1 {
    grid-column: 1 / -1;
    grid-row: 1 / -1;
  }
</style>

<svelte:window on:keydown={handleKeyDown} on:keyup={handleKeyUp} />

{#if phase == 'intro'}
  <div class="flex justify-center items-center">
    <div class="flex flex-col items-center gap-2 w-[800px] text-center">
    <h1 class="text-3xl font-bold">Rank Setups</h1>
    <p>To be able to quiz you on setups, a ranking of the setups is needed.</p>
    <p>After going through this process, you will get a file that can be imported into the quiz, which can determine if the setup is correct based on your rankings.</p>
    <p>The process will consist of a filter phase, which you will decide if the setup is even worth being ranked, and then the ranking phase.</p>
    <div class="flex gap-2 py-4">
      <label for="pc-select" class="block text-lg font-medium"> {m.lookup_pc_number()} </label>
      <select
        id="pc-select"
        name="pc"
        class="focus:shadow-outline block min-w-20 appearance-none rounded border border-gray-300 bg-white px-4 py-2 pr-8 leading-tight shadow hover:border-gray-400 focus:outline-none"
      >
        {#each pcs as pc (pc.id)}
          <option value={pc.id}>{pc.pc}</option>
        {/each}
      </select>
    </div>
    <button 
      class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
      on:click={() => phase = 'filter'}

    >Next</button>
    </div>
  </div>
{:else if phase == 'filter'}
  <div class="h-full w-full grid grid-rows-1 grid-cols-1">
  <div class="grid-area-1 z-0 grid grid-rows-1 grid-cols-2 h-full w-full p-8 gap-8">
    <div class="border border-green-500 rounded">
    <div class="overflow-y-scroll flex flex-wrap font-mono text-center">
      {#each keepPile.flat() as item}
        <span class="border basis-1/5 lg:basis-1/8 bg-white rounded py-2">{item}</span>
      {/each}
    </div>
    </div>
    <div class="border border-red-500 rounded">
    <div class="overflow-y-scroll flex flex-wrap font-mono text-center">
      {#each discardPile.flat() as item}
        <span class="border basis-1/5 lg:basis-1/8 bg-white rounded py-2">{item}</span>
      {/each}
    </div>
    </div>
  </div>
  <div class="grid-area-1 z-1 h-full w-full flex justify-center items-center">
    {#if groupIndex < pile.length}
      <p class="border rounded bg-white p-8">{pile[groupIndex][pile[groupIndex].length - 1]}</p>
    {:else}
      <button on:click={async () => {
        phase = 'rank';
        await startRanking();
      }}> 
        Start Ranking
      </button>
    {/if}
  </div>
  </div>
{:else if phase == 'rank'}
  {#if currentComparison !== null}
    <div class="duel-box">
      {currentComparison.a}
      
      <span> vs </span>
      
      {currentComparison.b}

      <p>Step {currentStep} of ~{totalSteps}</p>
    </div>
  {/if}

{:else if phase == 'results'}
  <h3>Your Final Ranking:</h3>
  <ol>
    {#each rankedList as item}
      <li>{item}</li>
    {/each}
  </ol>
{/if}

