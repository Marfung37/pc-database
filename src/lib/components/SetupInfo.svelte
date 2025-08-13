<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import PathDownload from '$lib/components/PathDownload.svelte';
  import { ChevronRight } from '@lucide/svelte';

  export let setup;
  export let submittedQueue;
  export let baseUrl;
  export let next = true;
  const oqb = setup.oqb_path !== null;
</script>

<div class="flex min-h-60 w-full rounded-3xl bg-white shadow-lg">
  <div class="flex flex-1 flex-wrap">
    <div class="flex">
      <div class="flex min-w-80 basis-1/2 items-center justify-center p-4 xl:basis-1/3">
        <FumenRender fumen={setup.fumen} />
      </div>
      <div class="flex-1">
        <h2 class="py-2 text-2xl">{setup.setup_id}</h2>
        <!-- <h3 class="text-xl pb-2">Statistics</h3> -->
        {#if setup.solve_percent}
          <p>{m.lookup_solve_percent()}: {setup.solve_percent}%</p>
        {/if}
        <p>OQB: {oqb ? m.yes() : m.no()}</p>
        {#if setup.cover_description}
          <p>{m.cover_description()}: {setup.cover_description}</p>
        {/if}
        <p>{m.cover_pattern()}: {setup.cover_pattern}</p>
        <p>{m.exact_cover_pattern()}: {setup.cover_data === null ? m.yes() : m.no()}</p>
        <p>{m.lookup_credit()}: {setup.credit ? setup.credit : m.lookup_unknown()}</p>
        {#if setup.solve_pattern}
          <PathDownload setupid={setup.setup_id} />
        {/if}
        <!-- <p>Minimal Solves</p> -->
        <!-- <p>Variants</p> -->
      </div>
    </div>
    {#if setup.saves}
      <div
        class="flex h-60 w-full flex-col flex-wrap gap-x-2 p-4 xl:w-auto xl:p-0 xl:py-12 xl:pl-8"
      >
        {#each setup.saves as save (save.save)}
          {#if save.save_fraction}
          <p>
            {save.description ?? save.save}: {save.save_percent.toFixed(2)}% ({save.save_fraction.numerator}/{save.save_fraction.denominator})
          </p>
          {:else}
            <div>
              <p>Priority Saves</p>
              {#each save.priority_save_percent as save_percent, index}
                {@const save_fraction = save.priority_save_fraction[index]}
                {@const description = save.description?.split(', ')[index] ?? save.save.split(',')[index]}
                <p class="pl-2">
                  {description}: {save_percent.toFixed(2)}% ({save_fraction.numerator}/{save_fraction.denominator})
                </p>
              {/each}
            </div>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
  {#if next}
    <a
      class="flex min-w-20 items-center justify-center rounded-r-3xl transition-colors duration-500 ease-in-out {oqb
        ? 'bg-blue-100 hover:bg-blue-200'
        : 'hover:bg-gray-200'}"
      href={`${baseUrl}${setup.setup_id}` + (oqb ? `+${submittedQueue}` : '')}
    >
      <ChevronRight size={32} />
    </a>
  {/if}
</div>
