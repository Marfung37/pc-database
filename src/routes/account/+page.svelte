<!-- src/routes/account/+page.svelte -->
<script lang="ts">
  import { enhance, applyAction } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { m } from '$lib/paraglide/messages.js';

  export let data;
  export let form;

  let { session, profile } = data;
  $: ({ session, profile } = data);

  let profileForm: HTMLFormElement;
  let loading = false;
  let username: string = profile?.username ?? '';

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ result }) => {
      loading = false;
      applyAction(result);
    };
  };

  const handleSignOut: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      loading = false;
      update();
    };
  };
</script>

<div class="hero min-h-[60vh]">
  <div class="hero-content text-center py-12">
    <div class="max-w-xl">
      <div class="flex flex-col gap-4 items-center justify-center sm:px-6 lg:px-8">
        <div class="min-w-xs sm:min-w-md max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
          <form 
            class="space-y-6" 
            method="POST" 
            action="?/update"
            use:enhance={handleSubmit}
            bind:this={profileForm}
          >
            <div class="text-center">
              <h2 class="mt-6 text-3xl font-extrabold">
                Your Profile
              </h2>
            </div>

            {#if form?.message}
              <div
                class="p-3 text-sm rounded-md {form?.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}"
                role="alert"
              >
                {form?.message}
              </div>
            {/if}

            <div class="space-y-4">
              <div>
                <label for="email" class="block text-sm font-medium">
                  {m.email_address()}
                </label>
                <div class="mt-1">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autocomplete="email"
                    required
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={session.user.email ?? ''}
                    disabled
                  />
                </div>
              </div>
              {#if form?.errors?.email}
                <span class="text-red-600 text-sm">
                  {form?.errors?.email}
                </span>
              {/if}

              <div>
                <label for="username" class="block text-sm font-medium">
                  {m.username()}
                </label>
                <div class="mt-1">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={form?.username ?? username} 
                  />
                </div>
              </div>
              {#if form?.errors?.username}
                <span class="text-red-600 text-sm">
                  {form?.errors?.username}
                </span>
              {/if}
            </div>
            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                disabled={loading}
              >
                {loading ? m.loading() : m.btn_save()}
              </button>
            </div>
          </form>

          <form method="post" action="?/signout" use:enhance={handleSignOut}>
            <div>
              <button
                type="submit"
                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer"
                disabled={loading}
              >
                {m.nav_logout()}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>
