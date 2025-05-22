<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import { Grid } from 'wx-svelte-grid';
  import { Willow } from 'wx-svelte-grid';

  export let data;

  const { columns } = data;

  const gridData = data.gridData.map((x) => {
    return { ...x, solve_percent: x.statistics[0].solve_percent };
  });
</script>

<div class="hero min-h-[60vh]">
  <div class="hero-content py-12 text-center">
    <div class="w-full">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        WIP: {m.nav_database()}
      </div>

      <Willow>
        <Grid data={gridData} {columns} />
      </Willow>
    </div>
  </div>
</div>
