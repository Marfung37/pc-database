<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

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

  onMount(async () => {
    loading = true;
    error = null;

    if (!fumen) {
      // can't load image
      return;
    }

    try {
      const params = new URLSearchParams();
      params.append('data', fumen);
      if (scale)  params.append('scale', String(scale));
      if (clear)  params.append('clear', String(clear));
      if (mirror) params.append('mirror', String(mirror));
      if (loop)   params.append('loop', String(loop));
      if (delay)  params.append('delay', String(delay));
      const url = `/render?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.blob();

      imageSrc = URL.createObjectURL(data);
    } catch (e: any) {
      error = e.message;
      console.error('Error fetching or processing image:', e);
    } finally {
      loading = false;
    }
  });

  // Crucial: Revoke the Object URL when the component is destroyed
  onDestroy(() => {
    if (imageSrc) {
      URL.revokeObjectURL(imageSrc);
      fetchedImageSrc = null;
    }
  });
</script>

{#if loading}
  <p>Loading image...</p>
{:else if error}
  <p>Error: {error}</p>
{:else if imageSrc}
  <div 
    class="h-auto w-full pt-4 rounded-md bg-gray-200 border-gray-200 border">
    <img class="h-auto w-full" src={imageSrc} alt={fumen} />
  </div>
{:else}
  <p></p>
{/if}
