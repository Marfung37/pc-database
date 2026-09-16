<script lang="ts">
  import FumenRender from '$lib/components/FumenRender.svelte';

  let { fumen, solve_percent } = $props();
</script>

<div class="card flex flex-col">
  <div class="flex min-w-80 items-center justify-center p-4">
    <FumenRender {fumen} minHeight={4} />
  </div>
  {#if solve_percent}
    <div class="flex justify-center">
      <p>{solve_percent.toFixed(2)}%</p>
    </div>
  {/if}
</div>
