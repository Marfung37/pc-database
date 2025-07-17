<script lang="ts">
  import { browser } from '$app/environment';
  import { onMount, onDestroy } from 'svelte';
  import { Clipboard, ClipboardCheck } from '@lucide/svelte';

  export let fumen: string = null;
  export let scale: number = null;
  export let clear: number = null;
  export let mirror: boolean = null;
  export let loop: boolean = null;
  export let delay: number = null;

  let loading: boolean = false;
  let error: string | null = null;

  let imageSrc: string | null = null;
  const type = 'image/png';

  let showFeedback: boolean = false;
  let feedbackMessage: string = '';

  /**
   * Copies the fumen string to the user's clipboard.
   * Provides visual feedback to the user.
   */
  async function copyContent(): Promise<void> {
    // Check if the Clipboard API is supported by the browser
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      feedbackMessage = 'Clipboard API not supported by your browser.';
      showFeedback = true;
      console.warn('Clipboard API not supported.');
      return;
    }

    try {
      await navigator.clipboard.writeText(fumen);
      feedbackMessage = 'Copied fumen!';
      showFeedback = true;
    } catch (err) {
      console.error('Failed to copy content:', err);
      feedbackMessage = 'Failed to copy to clipboard.';
      showFeedback = true;
    } finally {
      // Hide the feedback message after a short delay
      setTimeout(() => {
        showFeedback = false;
        feedbackMessage = '';
      }, 1000); // Display feedback for 1 seconds
    }
  }

  $: if (browser && fumen) {
    loading = true;
    error = null;
    (async () => {
      try {
        const params = new URLSearchParams();
        params.append('data', fumen);
        if (scale) params.append('scale', String(scale));
        if (clear) params.append('clear', String(clear));
        if (mirror) params.append('mirror', String(mirror));
        if (loop) params.append('loop', String(loop));
        if (delay) params.append('delay', String(delay));
        const url = `/api/render?${params.toString()}`;

        const response = await fetch(url);
        const data = await response.blob();

        imageSrc = URL.createObjectURL(data);
      } catch (e: any) {
        error = e.message;
        console.error('Error fetching or processing image:', e);
      } finally {
        loading = false;
      }
    })();
  };

  // Crucial: Revoke the Object URL when the component is destroyed
  onDestroy(() => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
      imageSrc = null;
    }
  });
</script>

{#if loading}
  <p>Loading image...</p>
{:else if error}
  <p>Error: {error}</p>
{:else if imageSrc}
  <div class="group relative h-auto w-full rounded-md border border-gray-200 bg-gray-200 pt-4">
    <img class="h-auto w-full" src={imageSrc} alt={fumen} />

    <div
      class={'transparent absolute top-[10px] right-[10px] z-20 rounded-md border-gray-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ' +
        (showFeedback ? 'bg-gray-100' : '')}
      class:border={showFeedback}
    >
      <div class="flex justify-end">
        {#if showFeedback}
          <span class="h-full p-2" class:show={showFeedback}>
            {feedbackMessage}
          </span>
        {/if}

        <button
          class="cursor-pointer rounded-md border border-gray-500 bg-gray-100 p-2 opacity-50 hover:opacity-80"
          class:border={!showFeedback}
          on:click={copyContent}
        >
          {#if showFeedback}
            <ClipboardCheck class="text-gray-500" />
          {:else}
            <Clipboard class="text-gray-500" />
          {/if}
        </button>
      </div>
    </div>
  </div>
{:else}
  <p></p>
{/if}
