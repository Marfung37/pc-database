<script>
  // shortcut for home page
  import { m } from '$lib/paraglide/messages.js';

  export let icon;
  export let name;
  export let description;
  export let href;
</script>

<article class="m-4 flex w-80 flex-col rounded-md border border-black p-4">
  <div class="flex flex-1 flex-col items-center gap-4 pb-4">
    <svelte:component this={icon} size={32} />
    <h2 class="text-2xl font-bold">{name}</h2>
    <p class="text-center text-lg">{description}</p>
  </div>

  <div class="flex justify-center">
    <a class="btn border border-black text-lg" {href}>{m.shortcut_go()}</a>
  </div>
</article>
