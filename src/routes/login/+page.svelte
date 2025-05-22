<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData, SubmitFunction } from './$types.js';

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

<form class="row flex-center flex" method="POST" use:enhance={handleSubmit}>
  <div class="form-widget col-6">
    <h1 class="header">Supabase + SvelteKit</h1>
    <p class="description">Sign in with email and password</p>
    {#if form?.message !== undefined}
      <div class="success {form?.success ? '' : 'fail'}">
        {form?.message}
      </div>
    {/if}
    <div>
      <label for="email">Email address</label>
      <input
        id="email"
        name="email"
        class="inputField"
        type="email"
        placeholder="Your email"
        value={form?.email ?? ''}
      />
      <label for="password">Password</label>
      <input
        id="password"
        name="password"
        class="inputField"
        type="password"
        placeholder="Your password"
        value={form?.password ?? ''}
      />
    </div>
    {#if form?.errors?.email}
      <span class="error flex items-center text-sm">
        {form?.errors?.email}
      </span>
    {/if}
    <div>
      <button class="button primary block">
        {loading ? 'Loading' : 'Login'}
      </button>
    </div>
  </div>
</form>
