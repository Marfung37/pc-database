<script lang="ts">
  import FumenRender from '$lib/components/FumenRender.svelte';
  import { Fraction } from '$lib/saves/fraction';
  import { fumenSplit } from '$lib/utils/fumenUtils';
  import { Clipboard, ClipboardCheck } from '@lucide/svelte';
  import { m } from '$lib/paraglide/messages.js';
  import { toast } from 'svelte-sonner';

  export let save;
  export let isOpen = false;

  // TODO: handle priority percent
  let header = `${save.description ?? save.save}: `;
  if (save.save_percent !== null) {
    header += `${save.save_percent?.toFixed(2)}% (${new Fraction(save.save_fraction.numerator, save.save_fraction.denominator).toString()})`;
  } else {
    header += save.priority_save_fraction
      .map(
        (f) =>
          `${((f.numerator / f.denominator) * 100).toFixed(2)}% (${new Fraction(f.numerator, f.denominator).toString()})`
      )
      .join(', ');
  }

  isOpen = save.minimal_solves ? false : isOpen;

  /**
   * Copies the fumen string to the user's clipboard.
   * Provides visual feedback to the user.
   */
  async function copyContent(): Promise<void> {
    // Check if the Clipboard API is supported by the browser
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error(m.copy_not_supported());
      console.warn('Clipboard API not supported.');
      return;
    }

    try {
      await navigator.clipboard.writeText(save.minimal_solves);
      toast.success(m.fumen_copied());
    } catch (err) {
      toast.error(m.fumen_copy_failed());
      console.error('Failed to copy content:', err);
    }
  }
</script>

<div class="mb-2 overflow-hidden rounded-md border border-gray-200 shadow-sm">
  <button
    class="flex w-full items-center justify-between border-none
         bg-gray-100 p-4 text-left text-lg font-semibold
         {save.minimal_solves
      ? 'cursor-pointer hover:bg-gray-200'
      : ''} focus:ring-opacity-50 focus:ring-2 focus:ring-blue-500 focus:outline-none"
    on:click={() => (isOpen = !isOpen)}
  >
    {header}
    {#if save.minimal_solves}
      <span class="transform text-2xl transition-transform duration-300" class:rotate-180={isOpen}>
        {isOpen ? '−' : '+'}
      </span>
    {/if}
  </button>
  {#if isOpen}
    <div class="flex flex-col gap-2 p-4">
      <button
        class="text-left text-2xl text-blue-500 hover:cursor-pointer hover:text-blue-700"
        on:click={copyContent}
      >
        {m.copy_minimal()}
      </button>
      <div class="grid grid-cols-2 gap-2 text-sm md:grid-cols-4 xl:grid-cols-8">
        {#each fumenSplit(save.minimal_solves) as fumen (fumen)}
          <FumenRender {fumen} />
        {/each}
      </div>
    </div>
  {/if}
</div>
