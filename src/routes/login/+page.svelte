<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, SubmitFunction } from './$types.js';
  import { m } from '$lib/paraglide/messages.js';

  export let form: ActionData;

  let loading = false;

  const handleSubmit: SubmitFunction = () => {
    loading = true;
    return async ({ update }) => {
      update();
      loading = false;
    };
  };
</script>

<div class="hero min-h-[60vh]">
  <div class="hero-content py-12 text-center">
    <div class="max-w-xl">
      <div class="flex items-center justify-center sm:px-6 lg:px-8">
        <div
          class="w-full max-w-md min-w-xs space-y-8 rounded-lg bg-white p-8 shadow-lg sm:min-w-md"
        >
          <form class="space-y-6" method="POST" use:enhance={handleSubmit}>
            <div class="text-center">
              <h2 class="mt-6 text-3xl font-extrabold">
                {m.nav_login()}
              </h2>
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
                    placeholder={m.email_address()}
                    value={form?.email ?? ''}
                  />
                </div>
              </div>
              {#if form?.errors?.email}
                <span class="text-sm text-red-600">
                  {form?.errors?.email}
                </span>
              {/if}

              <div>
                <label for="password" class="block text-sm font-medium">
                  {m.password()}
                </label>
                <div class="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autocomplete="current-password"
                    required
                    class="block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
                    placeholder={m.password()}
                    value={form?.password ?? ''}
                  />
                </div>
              </div>
              {#if form?.errors?.password}
                <span class="text-sm text-red-600">
                  {form?.errors?.password}
                </span>
              {/if}
            </div>

            <div>
              <button
                type="submit"
                class="flex w-full cursor-pointer justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
                disabled={loading}
              >
                {loading ? m.loading() : m.nav_login()}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</div>
