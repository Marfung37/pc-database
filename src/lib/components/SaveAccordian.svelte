<script lang='ts'>
  import FumenRender from '$lib/components/FumenRender.svelte';
  import { Fraction } from '$lib/saves/fraction';
  import { fumenSplit } from '$lib/utils/fumenUtils';
  import { Clipboard, ClipboardCheck } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

  export let save;
  export let isOpen = false;

  // TODO: handle priority percent
  let header = `${save.description ?? save.save}: `
  if (save.save_percent) {
   header += `${save.save_percent?.toFixed(2)}% (${(new Fraction(save.save_fraction.numerator, save.save_fraction.denominator)).toString()})`;
  } else {
   header += `${save.save_percent?.toFixed(2)}% (${(new Fraction(save.save_fraction.numerator, save.save_fraction.denominator)).toString()})`;
        save.priority_save_fraction
          .map((f) => `${(f.numerator / f.denominator).toFixed(2)}% (${new Fraction(f.numerator, f.denominator).toString()})`)
          .join(', ')
  }

  isOpen = (save.minimal_solves) ? false: isOpen;

  /**
   * Copies the fumen string to the user's clipboard.
   * Provides visual feedback to the user.
   */
  async function copyContent(): Promise<void> {
    // Check if the Clipboard API is supported by the browser
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      toast.error('Clipboard API not supported by your browser.')
      console.warn('Clipboard API not supported.');
      return;
    }

    try {
      await navigator.clipboard.writeText(save.minimal_solves);
      toast.success('Copied fumen!')
    } catch (err) {
      toast.error('Failed to copy to clipboard.')
      console.error('Failed to copy content:', err);
    }
  }
</script>

<div class="border border-gray-200 mb-2 rounded-md overflow-hidden shadow-sm">
  <button
    class="w-full bg-gray-100 p-4 text-left border-none
         flex justify-between items-center text-lg font-semibold
         {(save.minimal_solves) ? 'hover:bg-gray-200 cursor-pointer': ''} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    on:click={() => isOpen = !isOpen}
  >
    {header}
    {#if save.minimal_solves}
    <span class="text-2xl transition-transform duration-300 transform"
        class:rotate-180={isOpen}
    >
      {isOpen ? '−' : '+'}
    </span>
    {/if}
  </button>
  {#if isOpen}
    <div class="p-4 flex flex-col gap-2">
      <button 
        class="text-2xl text-left text-blue-500 hover:text-blue-700 hover:cursor-pointer"
        on:click={copyContent}
      > Copy Minimal Fumen </button>
      <div class="grid grid-cols-2 text-sm md:grid-cols-4 xl:grid-cols-8 gap-2">
      {#each fumenSplit(save.minimal_solves) as fumen (fumen)}
        <FumenRender fumen={fumen} />
      {/each}
      </div>
    </div>
  {/if}
</div>
