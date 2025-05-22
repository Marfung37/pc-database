<script lang="ts">
  import '../app.css';
  import { m } from '$lib/paraglide/messages.js';
  import { invalidate } from '$app/navigation';
  import { onMount } from 'svelte';
	import LocaleSwitcher from '$lib/components/LocaleSwitcher.svelte';
  import { User } from '@lucide/svelte';

  export let data;

  let { supabase, session } = data;
  $: ({ supabase, session } = data);

  onMount(() => {
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth');
      }
    });

    return () => data.subscription.unsubscribe();
  });
</script>

<div class="navbar bg-base-100 container mx-auto">
  <div class="flex-1 flex items-center">
    <a class="btn btn-ghost normal-case text-xl" href="/">{m.website_name()}</a>
  </div>
  <div class="flex-none">
    <ul class="menu menu-horizontal px-1 hidden sm:flex sm:items-center font-bold text-lg">
      <li class="md:mx-2"><a href="/database">{m.nav_database()}</a></li>
      <li class="md:mx-2"><a href="/about">{m.nav_about()}</a></li>
      <li class="md:mx-2"><a href="/account"><User /></a></li>
      <li class="md:mx-2"><LocaleSwitcher /></li>
    </ul>
    <div class="menu menu-horizontal px-1 sm:hidden flex items-center font-bold text-lg">
    <a class="btn btn-ghost btn-circle" href="/account"><User /></a>
    <div class="dropdown dropdown-end mx-2">
      <!-- svelte-ignore a11y_label_has_associated_control -->
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <label tabindex="0" class="btn btn-ghost btn-circle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          ><path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          /></svg
        >
      </label>
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <ul
        tabindex="0"
        class="menu menu-lg dropdown-content mt-3 z-1 p-2 shadow-sm bg-base-100 rounded-box w-52 font-bold"
      >
        <li><a href="/database">{m.nav_database()}</a></li>
        <li><a href="/about">{m.nav_about()}</a></li>
        <li><LocaleSwitcher /></li>
      </ul>
    </div>
    </div>
  </div>
</div>

<div class="">
  <slot />
</div>
