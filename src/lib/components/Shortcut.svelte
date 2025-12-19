<script>
  // shortcut for home page
  import { m } from '$lib/paraglide/messages.js';

  export let icon;
  export let name;
  export let description;
  export let href;
</script>

<article class="border rounded-md border-black flex flex-col w-80 m-4 p-4">
  <div class="flex-1 flex flex-col items-center gap-4 pb-4">
    <svelte:component this={icon} size={32}/>
    <h2 class="text-2xl font-bold">{name}</h2>
    <p class="text-lg text-center">{description}</p>
  </div>
  
  <div class="flex justify-center">
    <a class="btn border border-black text-lg" href={href}>{m.shortcut_go()}</a>
  </div>
</article>
