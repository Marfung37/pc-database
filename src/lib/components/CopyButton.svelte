<script>
  import Copy from '@lucide/svelte/icons/copy';
  import CopyCheck from '@lucide/svelte/icons/copy-check';

  export let textToCopy = '';
  export let hoverText = textToCopy;

  let isCopy = false;

  /**
   * Handles the click event to copy the text to the clipboard.
   */
  async function handleCopyClick() {
    // Check if the Clipboard API is supported by the browser
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      console.warn('Clipboard API not supported.');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      isCopy = true;
      setTimeout(() => {
        isCopy = false;
      }, 1000); // Display feedback for 1 seconds
    } catch (err) {
      console.error('Failed to copy content:', err);
    }
  }
</script>

<button class="group relative" on:click={handleCopyClick} tabindex="0">
  <!-- The main icon, changes color on hover and click -->
  {#if isCopy}
    <CopyCheck class="text-blue-500 hover:cursor-pointer hover:text-blue-700" />
  {:else}
    <Copy class="text-blue-500 hover:cursor-pointer hover:text-blue-700" />
  {/if}

  <!-- The tooltip for hover state -->
  <span
    class="invisible absolute top-[-150%] z-99 -ml-[50%] rounded-md border-r-2 border-b-2 border-gray-200 bg-gray-100 p-1 text-nowrap shadow-xl transition-opacity group-hover:visible"
  >
    {hoverText}
  </span>
</button>
