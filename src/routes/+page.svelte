<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import Shortcut from '$lib/components/Shortcut.svelte';
  import { Database, Search, PackageSearch } from '@lucide/svelte'
</script>

<div class="hero min-h-[20vh] mt-12">
  <div class="hero-content py-12 text-center">
    <div class="max-w-xl">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        {m.website_name()}
      </div>
    </div>
  </div>
</div>

<div class="flex flex-wrap w-full justify-center gap-8">
  <Shortcut icon={Database} name={m.nav_database()} description={m.home_database_description()} href="./database"/>
  <Shortcut icon={Search} name={m.nav_lookup()} description={m.home_lookup_description()} href="./lookup"/>
  <!-- <Shortcut icon={PackageSearch} name={m.nav_quiz()} description={m.home_quiz_description()} href="."/> -->
</div>
