<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
  import FumenRender from '$lib/components/FumenRender.svelte';
  import ComponentText from '$lib/components/ComponentText.svelte';
  import { ArrowRight, Square, SquareX } from '@lucide/svelte';

  const iconProps = {
    class: 'inline-block'
  }
</script>

<!-- <div class="hero min-h-[60vh]"> -->
<!--   <div class="hero-content py-12 text-center"> -->
<!--     <div class="max-w-xl"> -->
<!--       <div -->
<!--         class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl" -->
<!--       > -->
<!--         WIP: {m.nav_about()} -->
<!--       </div> -->
<!--     </div> -->
<!--   </div> -->
<!-- </div> -->

<div class="container mx-auto p-2 pb-32 text-left">
  <h1 class="py-2 text-4xl"> {m.nav_about() } </h1>
  <h2 class="py-2 text-2xl">{ m.about_pc_heading() }</h2>
  <div class="flex flex-col items-center">
    <div class="w-1/2 flex justify-between items-center">
      <div class="w-1/3">
        <p>{ m.about_pc_setup() }</p>
        <FumenRender fumen="v115@HhwwIexwHewwSeNJJ9gBtIeBtkeAgHThR4GeR4QeAg?HahglGeilJeAgHOhRpHeRpUeAgHEhi0Ieg0deAgHDhwhIew?hIewhIewhMeAgH" clipboard={false}/>
      </div>
      <ArrowRight size={36}/>
      <div class="w-1/3">
        <p>{ m.about_pc_solve() }</p>
        <FumenRender fumen="v115@9gB8CeglG8ilH8BeG8CeD8JeAgHLhQ4IeR4IeQ4NeA?gHThBtIeBtOeAgH" clipboard={false}/>
      </div>
    </div>
  </div>
  <div class="flex flex-col items-center">
    <table class="table w-1/2 p-4 bg-white border-radius-32">
      <caption class="caption-bottom">
        <ComponentText 
          message={m.about_pc_table_caption()}
          components={{
            'square_icon': Square,
            'squarex_icon': SquareX,
          }}
          componentProps={iconProps}
        />
      </caption>
      <thead>
        <tr>
          <th>No.</th>
          <th>Leftover</th>
          <th>Next Bag</th>
          <th>Subsequent Bag</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1st</td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(3).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(4).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>2nd</td>
          <td>
            <div class="flex">
              {#each Array(4).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(6).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(1).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>3rd</td>
          <td>
            <div class="flex">
              {#each Array(1).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(2).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(5).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>4th</td>
          <td>
            <div class="flex">
              {#each Array(5).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(5).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(2).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>5th</td>
          <td>
            <div class="flex">
              {#each Array(2).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(1).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(6).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>6th</td>
          <td>
            <div class="flex">
              {#each Array(6).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(4).fill(0) as _,i (i)} <SquareX /> {/each}
              {#each Array(3).fill(0) as _,i (i)} <Square /> {/each}
            </div>
          </td>
        </tr>
        <tr>
          <td>7th</td>
          <td>
            <div class="flex">
              {#each Array(3).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
          <td>
            <div class="flex">
              {#each Array(7).fill(0) as _,i (i)} <SquareX /> {/each}
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <p>{ m.about_pc() }</p>
  <h2 class="py-2 text-2xl">{ m.about_website_heading() }</h2>
  <p>{ m.about_website_section_one() }<a href="/lookup" class="text-blue-500 hover:text-blue-900" >{ m.about_website_lookup_link() }</a>{ m.about_website_section_two() }</p>
</div>

