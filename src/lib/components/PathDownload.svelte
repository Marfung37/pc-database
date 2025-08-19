<script lang="ts">
  import { PUBLIC_DEFAULT_KICKTABLE, PUBLIC_DEFAULT_HOLDTYPE } from '$env/static/public';
  import { m } from '$lib/paraglide/messages.js';
  import type { SetupID, Kicktable, HoldType } from '$lib/types';

  export let setupid: SetupID;
  export let kicktable: Kicktable = PUBLIC_DEFAULT_KICKTABLE as Kicktable;
  export let holdtype: HoldType = PUBLIC_DEFAULT_HOLDTYPE as HoldType;
  export let level: number = 4;

  let downloading = false;

  function generatePathFilename(setupid: SetupID, kicktable: Kicktable, holdtype: HoldType) {
    return `${setupid}-${kicktable}-${holdtype}.csv`;
  }

  async function download() {
    downloading = true;

    const params = new URLSearchParams();
    params.append('setupid', setupid);
    params.append('kicktable', kicktable);
    params.append('holdtype', holdtype);
    params.append('level', level.toString());
    const url = `/api/path?${params.toString()}`;

    let response;
    try {
      response = await fetch(url);
    } catch (e) {
      console.error('Failed to get file:', (e as Error).message);
      downloading = false;
      return;
    }
    if (!response.ok) {
      console.error('Failed to get file');
      downloading = false;
      return;
    }

    const data = await response.blob();

    if (data) {
      // Create download link
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = generatePathFilename(setupid, kicktable, holdtype);
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    }

    downloading = false;
  }
</script>

<button class="cursor-pointer" on:click={download} disabled={downloading}>
  {downloading ? m.processing() : m.lookup_download_path()}
</button>
