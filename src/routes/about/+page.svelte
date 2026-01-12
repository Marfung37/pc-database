<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import ComponentText from '$lib/components/ComponentText.svelte';
  import { ArrowDown, ArrowRight, Square, SquareX } from '@lucide/svelte';

  const iconProps = {
    class: 'inline pb-[3px]',
    size: 16
  };
</script>

<div class="container mx-auto flex flex-col gap-4 p-2 pb-32 text-left">
  <h1 class="py-2 text-4xl">{m.nav_about()}</h1>
  <h2 class="py-2 text-2xl">{m.about_pc_heading()}</h2>
  <p>{m.about_pc()}</p>
  <div class="flex flex-col items-center">
    <div
      class="flex w-2/3 flex-col items-center justify-center gap-3 lg:flex-row lg:items-center lg:justify-between"
    >
      <div class="w-full lg:w-1/2">
        <p>{m.about_pc_setup()}</p>
        <FumenRender
          fumen="v115@HhwwIexwHewwSeNJJ9gBtIeBtkeAgHThR4GeR4QeAg?HahglGeilJeAgHOhRpHeRpUeAgHEhi0Ieg0deAgHDhwhIew?hIewhIewhMeAgH"
          clipboard={false}
        />
      </div>
      <ArrowRight class="hidden lg:block" size={36} />
      <ArrowDown class="block lg:hidden" size={36} />
      <div class="w-full lg:w-1/2">
        <p>{m.about_pc_solve()}</p>
        <FumenRender
          fumen="v115@9gB8CeglG8ilH8BeG8CeD8JeAgHLhQ4IeR4IeQ4NeA?gHThBtIeBtOeAgH"
          clipboard={false}
        />
      </div>
    </div>
  </div>
  <p>{m.about_pc_num()}</p>
  <div class="flex flex-col items-center">
    <table class="border-radius-32 table w-1/2 bg-white p-4 shadow">
      <caption class="caption-bottom">
        <ComponentText
          message={m.about_pc_table_caption()}
          components={{
            square_icon: Square,
            squarex_icon: SquareX
          }}
          componentProps={iconProps}
        />
      </caption>
      <thead>
        <tr>
          <th>{m.about_pc_table_heading_number()}</th>
          <th>{m.about_pc_table_heading_leftover()}</th>
          <th>{m.about_pc_table_heading_next_bag()}</th>
          <th>{m.about_pc_table_heading_subsequent_bag()}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1st</td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(3).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(4).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>2nd</td>
          <td>
            <div class="flex">
              {#each Array(4).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(6).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(1).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>3rd</td>
          <td>
            <div class="flex">
              {#each Array(1).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(2).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(5).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>4th</td>
          <td>
            <div class="flex">
              {#each Array(5).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(5).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(2).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>5th</td>
          <td>
            <div class="flex">
              {#each Array(2).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(1).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(6).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>6th</td>
          <td>
            <div class="flex">
              {#each Array(6).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(4).fill(0) as _, i (i)}
                <SquareX />
              {/each}
              {#each Array(3).fill(0) as _, i (i)}
                <Square />
              {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>7th</td>
          <td>
            <div class="flex">
              {#each Array(3).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _, i (i)}
                <SquareX />
              {/each}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <h2 class="py-2 text-2xl">{m.about_website_heading()}</h2>
  <p>
    {m.about_website_section_one()}<a href="/lookup" class="text-blue-500 hover:text-blue-900"
      >{m.about_website_lookup_link()}</a
    >{m.about_website_section_two()}
  </p>
</div>
