<script lang="ts">
	import type { PageProps, SubmitFunction } from './$types';
  import { enhance, applyAction } from '$app/forms';
  import { m } from '$lib/paraglide/messages.js';
  import SetupInfo from '$lib/components/SetupInfo.svelte';
  import SaveAccordian from '$lib/components/SaveAccordian.svelte';

  const { data, form }: PageProps = $props();

  let setup = $derived(data.setup);
  let subbuild = $derived(data.subbuild);

  let loading = $state(false);

  let queueValue: string = $state('');
  let submittedQueue: string = $state('');

  $effect(() => {
    // Update the bound variable with the sanitized value
    queueValue = queueValue.replace(/[^TILJSZOtiljszo]/g, '').toUpperCase();
    console.log(queueValue);
  });

  const handleSaveSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ result }) => {
      loading = false;
      applyAction(result);
    };
  };

  const handleSubmit: SubmitFunction = ({ formData }) => {
    loading = true;
    submittedQueue = subbuild + formData.get('queue');
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
  <h1 class="py-2 text-3xl">{m.lookup_current_setup()}</h1>
  <SetupInfo {setup} submittedQueue={subbuild} baseUrl="" next={false} />

  {#if setup.solve_pattern}
    <form
      class="flex w-full items-center gap-2 whitespace-nowrap"
      method="post"
      action="?/saves_percent"
      use:enhance={handleSaveSubmit}
    >
      <label for="wanted-save" class="block text-lg font-medium"> {m.lookup_wanted_saves()} </label>
      <input
        id="wanted-save"
        name="wantedSaves"
        type="text"
        class="focus:shadow-outline block max-w-64 grow appearance-none rounded border border-gray-300 bg-white text-lg leading-tight shadow hover:border-gray-400 focus:outline-none"
        value={form?.wantedSaves ?? ''}
      />
      <input type="hidden" name="setupid" value={setup.setup_id} />
      <input type="hidden" name="build" value={setup.build} />
      <input type="hidden" name="leftover" value={setup.leftover} />
      <input type="hidden" name="pc" value={setup.pc} />
      <button
        type="submit"
        class="flex cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
        disabled={loading}
      >
        {loading ? m.loading() : m.btn_submit()}
      </button>
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
    <p>
      {m.lookup_save_percent()}:
      {#if form?.fractions}
        {loading
          ? m.loading()
          : (form?.fractions
              .map((f) => `${((parseInt(f.split('/')[0]) / parseInt(f.split('/')[1])) * 100).toFixed(2)}% (${f})`)
              .join(', ') ?? '')}
      {/if}
    </p>
  {/if}

  <!-- TODO: solve pattern not quite accurate for leaf node -->
  {#if subbuild.length > 0 && setup.solve_pattern === null}
    <h1 class="py-2 text-3xl">{m.lookup_next_setup()}</h1>
    <form
      class="flex w-full whitespace-nowrap"
      method="POST"
      action="?/lookup"
      use:enhance={handleSubmit}
    >
      <div class="flex flex-wrap items-center gap-2">
        <label for="queue-text" class="block text-lg font-medium"> {m.lookup_queue()}: </label>
        <span class="mino text-2xl">
          {subbuild}
        </span>
        <input
          id="queue-text"
          name="queue"
          type="text"
          pattern="[TILJSZO]+"
          bind:value={queueValue}
          class="mino focus:shadow-outline block min-w-40 grow appearance-none rounded border border-gray-300 bg-white text-2xl leading-tight shadow hover:border-gray-400 focus:outline-none"
          maxlength={11 - subbuild.length}
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
      {#each form?.setups ?? [] as next_setup (next_setup.setup_id)}
        <SetupInfo setup={next_setup} {submittedQueue} baseUrl="/lookup/" />
      {/each}
    </div>
  {/if}

  <div>
    <h1 class="py-2 text-3xl">{m.lookup_saves()}</h1>
    {#each setup.saves as save (save.save)}
      <SaveAccordian {save} />
    {/each}
  </div>
</div>
