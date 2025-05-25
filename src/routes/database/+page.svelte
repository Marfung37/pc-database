<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import { m } from '$lib/paraglide/messages.js';
  import { Grid } from 'wx-svelte-grid';
  import { Willow } from 'wx-svelte-grid';

  export let data;
  export let form;

  const { columns } = data;
  let loading = false;

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

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ result }) => {
      loading = false;
      applyAction(result);
    };
  };
</script>

<div class="hero min-h-[60vh]">
  <div class="hero-content py-12 text-center">
    <div class="flex container flex-col gap-2">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        WIP: {m.nav_database()}
      </div>


      <div
        class="flex flex-col gap-2 items-center mx-auto"
      >
        <p class="text-2xl md:text-4xl font-bold px-2">{m.database_description()}</p>
        <a class="btn btn-outline btn-primary px-6 max-w-sm" href="/database/docs">{m.database_docs()}</a>
      </div>

      <form
        class="flex w-md whitespace-nowrap"
        method="POST"
        action="?/pcnum"
        use:enhance={handleSubmit}
      >
        <div class="flex items-center gap-2">
          <label for="pc-select" class="block text-lg font-medium"> {m.pc_number()} </label>
          <select
            id="pc-select"
            name="pc"
            class="focus:shadow-outline block w-full appearance-none rounded border border-gray-300 bg-white px-4 py-2 pr-8 leading-tight shadow hover:border-gray-400 focus:outline-none"
          >
            {#each pcs as pc (pc.id)}
              <option value={pc.id}>{pc.pc}</option>
            {/each}
          </select>
          <div>
            <button
              type="submit"
              class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
              disabled={loading}
            >
              {loading ? m.loading() : m.btn_submit()}
            </button>

            {#if form?.message}
              <div
                class="rounded-md p-3 text-sm {form?.success
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'}"
                role="alert"
              >
                {form?.message}
              </div>
            {/if}
          </div>
        </div>
      </form>

      <Willow>
        <Grid tree={true} footer={true} data={form?.gridData ?? []} {columns} />
      </Willow>
    </div>
  </div>
</div>
