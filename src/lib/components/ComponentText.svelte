<script lang="ts">
  import type { Component } from 'svelte';

  // This component will take the message and the components to render.
  export let message: string;
  export let components: Record<string, Component> = {};
  export let componentProps = {};

  // Split the message into parts based on placeholders
  const parts = message.split(/(\[.*?\])/);
</script>

{#each parts as part}
  {#if part.startsWith('[') && part.endsWith(']')}
    <svelte:component this={components[part.slice(1, -1)]} {...componentProps} />
  {:else}
    {part}
  {/if}
{/each}
