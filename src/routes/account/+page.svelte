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
  <div class="hero-content py-12 text-center">
    <div class="max-w-xl">
      <div class="flex flex-col items-center justify-center gap-4 sm:px-6 lg:px-8">
        <div
          class="w-full max-w-md min-w-xs space-y-8 rounded-lg bg-white p-8 shadow-lg sm:min-w-md"
        >
          <form
            class="space-y-6"
            method="POST"
            action="?/update"
            use:enhance={handleSubmit}
            bind:this={profileForm}
          >
            <div class="text-center">
              <h2 class="mt-6 text-3xl font-extrabold">Your Profile</h2>
            </div>

            {#if form?.message}
              <div
                class="rounded-md p-3 text-sm {form?.success
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'}"
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
                    class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                    value={session.user.email ?? ''}
                    disabled
                  />
                </div>
              </div>
              {#if form?.errors?.email}
                <span class="text-sm text-red-600">
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
                    class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                    value={form?.username ?? username}
                  />
                </div>
              </div>
              {#if form?.errors?.username}
                <span class="text-sm text-red-600">
                  {form?.errors?.username}
                </span>
              {/if}
            </div>
            <div>
              <button
                type="submit"
                class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
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
                class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
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
