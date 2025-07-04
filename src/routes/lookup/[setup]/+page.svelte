<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { enhance, applyAction } from '$app/forms';
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import PathDownload from '$lib/components/PathDownload.svelte';
  import { onMount } from 'svelte';
  import { ChevronRight } from '@lucide/svelte';

  export let data;
  export let form;

  const { setup, subbuild } = data;

  let loading = false;

  let queueValue: string = '';
  let submittedQueue: string = '';

  function enforceTetraminoOnly(event: Event) {
    const inputElement = event.target as HTMLInputElement;
    // Update the bound variable with the sanitized value
    queueValue = inputElement.value.replace(/[^TILJSZOtiljszo]/g, '').toUpperCase();
  }

  const handleSaveSubmit: SubmitFunction = ({ formData }) => {
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
  <div class="mb-16 flex min-h-60 w-full rounded-3xl bg-white shadow-lg">
    <div class="flex basis-1/2 items-center justify-center p-4 lg:basis-1/3 xl:basis-1/4">
      <FumenRender fumen={setup.fumen} />
    </div>
    <div class="flex-1">
      <h2 class="py-2 text-2xl">{setup.setup_id}</h2>
      <!-- <h3 class="text-xl pb-2">Statistics</h3> -->
      {#if setup.solve_percent}
        <p>{m.lookup_solve_percent()}: {setup.solve_percent}%</p>
      {/if}
      <p>OQB: {setup.oqb_path ? m.yes() : m.no()}</p>
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
    <p>
      {m.lookup_save_percent()}: {loading
        ? m.loading()
        : (form?.fractions
            .map((f) => `${((f.split('/')[0] / f.split('/')[1]) * 100).toFixed(2)}% (${f})`)
            .join(', ') ?? '')}
    </p>
  {/if}

  {#if subbuild.length > 0}
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
          on:input={enforceTetraminoOnly}
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
        {@const oqb = next_setup.oqb_path !== null}
        <div class="flex min-h-60 w-full rounded-3xl bg-white shadow-lg">
          <div class="flex basis-1/2 items-center justify-center p-4 lg:basis-1/3 xl:basis-1/4">
            <FumenRender fumen={next_setup.fumen} />
          </div>
          <div class="flex-1">
            <h2 class="py-2 text-2xl">{next_setup.setup_id}</h2>
            <!-- <h3 class="text-xl pb-2">Statistics</h3> -->
            {#if next_setup.solve_percent}
              <p>{m.lookup_solve_percent()}: {next_setup.solve_percent}%</p>
            {/if}
            <p>OQB: {oqb ? m.yes() : m.no()}</p>
            {#if next_setup.cover_description}
              <p>{m.cover_description()}: {next_setup.cover_description}</p>
            {/if}
            <p>{m.cover_pattern()}: {next_setup.cover_pattern}</p>
            <p>{m.exact_cover_pattern()}: {next_setup.cover_data === null ? m.yes() : m.no()}</p>
            <p>{m.lookup_credit()}: {next_setup.credit ? next_setup.credit : m.lookup_unknown()}</p>
            {#if next_setup.solve_pattern}
              <PathDownload setupid={next_setup.setup_id} />
            {/if}
            <!-- <p>Minimal Solves</p> -->
            <!-- <p>Variants</p> -->
          </div>
          <!-- TODO solve percent not completely accurate -->
          {#if oqb && !next_setup.solve_percent}
            <a

              class="flex min-w-20 justify-center items-center rounded-r-3xl transition-colors duration-500 ease-in-out bg-blue-100 hover:bg-blue-200"
              href="/lookup/{next_setup.setup_id}+{submittedQueue.slice(
                0,
                next_setup.build.length
              )}"
            >
              <ChevronRight size={32} />
            </a>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
