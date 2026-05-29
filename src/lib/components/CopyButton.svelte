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
  <div class="tooltip">
    <span class="tooltip-content text-lg">
      {hoverText}
    </span>

    <!-- The main icon, changes color on hover and click -->
    {#if isCopy}
      <CopyCheck class="text-info hover:text-info/70 hover:cursor-pointer" />
    {:else}
      <Copy class="text-info hover:text-info/70 hover:cursor-pointer" />
    {/if}
  </div>
</button>
