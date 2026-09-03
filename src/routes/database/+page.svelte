<script lang="ts">
  import { page } from '$app/state';
  import { resolve } from '$app/paths';
  import { goto } from '$app/navigation';
  import { m } from '$lib/paraglide/messages.js';
  import { ChevronLeft, ChevronsLeft, ChevronRight, ChevronsRight } from '@lucide/svelte';

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

  let params = $derived(page.url.searchParams);
  const pageNumber = $derived(Number(params.get('page') ?? '1'));
  const pcNumber: number | null = $derived(
    params.get('pc') !== null ? parseInt(params.get('pc')!) : null
  );

  async function changePage(value: number) {
    params.set('page', String(value));

    await goto(resolve(`/database?${params.toString()}`));
  }

  async function changePC(value: number) {
    if (value == -1) {
      params.delete('pc');
    } else {
      params.set('pc', String(value));
    }

    await goto(resolve(`/database?${params.toString()}`));
  }
</script>

<div class="hero min-h-[60vh]">
  <div class="hero-content py-12 text-center">
    <div class="container flex flex-col gap-2">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        WIP: {m.nav_database()}
      </div>
    </div>
  </div>
</div>

<div class="flex flex-col items-center">
  <section id="filter">
    <label for="pc">{m.database_pc_number()}</label>
    <select
      id="pc"
      class="bg-base-300 rounded"
      onchange={(e) => changePC(Number(e.currentTarget.value))}
    >
      <option value={-1}>All</option>
      {#each pcs as pc (pc.id)}
        <option value={pc.id} selected={pc.id == pcNumber}>{pc.pc}</option>
      {/each}
    </select>
  </section>
  <div id="results"></div>
  <div class="join">
    <button class="join-item btn" onclick={() => changePage(1)} disabled={pageNumber == 1}
      ><ChevronsLeft /></button
    >
    <button
      class="join-item btn"
      onclick={() => changePage(pageNumber - 1)}
      disabled={pageNumber == 1}><ChevronLeft /></button
    >
    <button class="join-item btn">Page {pageNumber}</button>
    <button class="join-item btn" onclick={() => changePage(pageNumber + 1)}
      ><ChevronRight /></button
    >
    <button class="join-item btn"><ChevronsRight /></button>
  </div>
</div>
