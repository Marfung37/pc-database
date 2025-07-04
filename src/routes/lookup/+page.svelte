<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import PathDownload from '$lib/components/PathDownload.svelte';
  import { ChevronRight } from '@lucide/svelte';

  export let form;

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

  let queueValue: string = '';
  let submittedQueue: string = '';

  function enforceTetraminoOnly(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Update the bound variable with the sanitized value
    queueValue = inputElement.value.replace(/[^TILJSZOtiljszo]/g, '').toUpperCase();
  }

  const handleSubmit: SubmitFunction = ({ formData }) => {
    loading = true;
    submittedQueue = formData.get('queue');
    return async ({ result }) => {
      loading = false;
      applyAction(result);
    };
  };
</script>

<div class="hero min-h-[10vh]">
  <div class="hero-content py-12 text-center">
    <div class="container flex flex-col gap-2">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        WIP: {m.nav_lookup()}
      </div>
    </div>
  </div>
</div>

<div class="container mx-auto flex flex-col gap-2 p-2 text-left">
  <form
    class="flex w-full whitespace-nowrap"
    method="POST"
    action="?/lookup"
    use:enhance={handleSubmit}
  >
    <div class="flex flex-wrap items-center gap-2">
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
      <label for="queue-text" class="block text-lg font-medium"> {m.lookup_queue()} </label>
      <input
        id="queue-text"
        name="queue"
        type="text"
        pattern="[TILJSZO]+"
        bind:value={queueValue}
        on:input={enforceTetraminoOnly}
        class="mino focus:shadow-outline block min-w-40 grow appearance-none rounded border border-gray-300 bg-white text-2xl leading-tight shadow hover:border-gray-400 focus:outline-none"
        maxlength={11}
        minlength={1}
      />
      <div>
        <button
          type="submit"
          class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
          disabled={loading}
        >
          {loading ? m.loading() : m.btn_submit()}
        </button>
      </div>
    </div>
  </form>
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

  <div class="flex flex-col gap-4">
    {#each form?.setups ?? [] as setup (setup.setup_id)}
      {@const oqb = setup.oqb_path !== null}
      <div class="flex min-h-60 w-full rounded-3xl bg-white shadow-lg">
        <div class="flex basis-1/2 items-center justify-center p-4 lg:basis-1/3 xl:basis-1/4">
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
        <a 
          class="flex min-w-20 justify-center items-center rounded-r-3xl transition-colors duration-500 ease-in-out {(oqb) ? 'bg-blue-100 hover:bg-blue-200': 'hover:bg-gray-200'}"
          href={`/lookup/${setup.setup_id}` + (oqb ? `+${submittedQueue}` : '')}
        >
            <ChevronRight size={32} />
        </a>
      </div>
    {/each}
  </div>
</div>
