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

<button
  class="relative group"
  on:click={handleCopyClick}
  tabindex="0"
>
  <!-- The main icon, changes color on hover and click -->
  {#if isCopy}
    <CopyCheck 
      class="text-blue-500 hover:text-blue-700 hover:cursor-pointer"
    />
  {:else}
    <Copy 
      class="text-blue-500 hover:text-blue-700 hover:cursor-pointer"
    />
  {/if}
  
  <!-- The tooltip for hover state -->
  <span 
    class="invisible z-99 absolute bg-gray-100 p-1 rounded-md text-nowrap shadow-xl border-b-2 border-r-2 border-gray-200 transition-opacity top-[-150%] -ml-[50%] group-hover:visible " 
  >
    {hoverText}
  </span>
</button>
