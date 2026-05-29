<script lang="ts">
  import { page } from '$app/state';
  import { m } from '$lib/paraglide/messages.js';
</script>

<main class="h-full flex flex-col gap-4 justify-center items-center">
  <h1 class="text-9xl">{page.status}</h1>
  <h2 class="text-5xl">{page.error.message}</h2>
</main>
