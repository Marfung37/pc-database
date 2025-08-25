<script lang="ts">
  import type { SetupData, SetupID } from '$lib/types';
  import { Fraction } from '$lib/saves/fraction';
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import PathDownload from '$lib/components/PathDownload.svelte';
  import CopyButton from '$lib/components/CopyButton.svelte';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';

  export let setup: SetupData;
  export let submittedQueue;
  export let baseUrl;
  export let next = true;
  const oqb = setup.type === 'oqb';
</script>

<div class="flex min-h-60 w-full rounded-3xl bg-white shadow-lg">
  <div class="flex flex-1 flex-wrap">
    <div class="flex min-w-80 basis-1/2 items-center justify-center p-4 xl:basis-1/3">
      <FumenRender fumen={setup.fumen} />
    </div>
    <div class="pl-4">
      <h2 class="py-2 text-2xl">{setup.setup_id}</h2>
      <!-- <h3 class="text-xl pb-2">Statistics</h3> -->
      {#if setup.solve_percent}
        <p>{m.lookup_solve_percent()}: {setup.solve_percent}%</p>
      {/if}
      <p>OQB: {oqb ? m.yes() : m.no()}</p>
      {#if setup.cover_description}
        <p>{m.cover_description()}: {setup.cover_description}</p>
      {/if}
      <div class="flex gap-1">
        <p>{m.cover_pattern()}: </p>
        <CopyButton textToCopy={setup.cover_pattern} />
      </div>
      <p>{m.exact_cover_pattern()}: {setup.cover_data === null ? m.yes() : m.no()}</p>
      <p>{m.lookup_credit()}: {setup.credit ? setup.credit : m.lookup_unknown()}</p>
      {#if setup.solve_pattern}
        <PathDownload setupid={setup.setup_id as SetupID} />
      {/if}
      <!-- <p>Minimal Solves</p> -->
      <!-- <p>Variants</p> -->
    </div>
    {#if setup.saves}
      <div
        class="flex h-60 w-full flex-col flex-wrap gap-x-2 p-4 xl:w-auto xl:p-0 xl:py-12 xl:pl-8"
      >
        {#each setup.saves as save (save.save)}
          {#if save.save_fraction !== null && save.save_percent !== null}
            {@const fraction = save.save_fraction as Fraction}
            <p>
              {save.name ?? save.save}: {save.save_percent.toFixed(2)}% ({fraction.numerator}/{fraction.denominator})
            </p>
          {:else if save.priority_save_percent !== null && save.priority_save_fraction !== null}
            <div>
              <p>{m.lookup_priority_saves()}</p>
              {#each save.priority_save_percent as save_percent, index}
                {@const save_fraction = save.priority_save_fraction[index] as Fraction}
                {@const description = save.name?.split(', ')[index] ?? save.save!.split(',')[index]}
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
