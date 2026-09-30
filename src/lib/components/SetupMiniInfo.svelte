<script lang="ts">
  import FumenRender from '$lib/components/FumenRender.svelte';
  import { Split, ArrowRight } from '@lucide/svelte';

  let { setup_id, fumen, solve_percent, type } = $props();
</script>

<div class="card flex flex-col">
  <div class="flex min-w-80 items-center justify-center p-4">
    <FumenRender {fumen} minHeight={4} />
  </div>
  <div class="relative flex justify-center items-center mx-4">
    {#if solve_percent}
      <p>{solve_percent.toFixed(2)}%</p>
    {/if}
    <div class="setup-icons absolute left-0 flex gap-1">
      {#if type == 'qb'}
        <span class="text-lg">QB</span>
      {/if}
      {#if type == 'oqb'}
        <Split />
      {/if}
    </div>

    <div class="setup-icons absolute right-0 flex gap-1">
      <a class="btn" href={'/database/' + setup_id}><ArrowRight /></a>
    </div>
  </div>
</div>
