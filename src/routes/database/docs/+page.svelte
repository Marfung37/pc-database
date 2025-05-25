<script lang="ts">
  import { m } from '$lib/paraglide/messages.js';
	import Hash from './hash.svx';
	import Path from './path.svx';
</script>

<div class="hero min-h-[10vh]">
  <div class="hero-content py-12 flex-col">
    <div class="flex container flex-col gap-2 text-center ">
      <div
        class="from-primary to-accent mb-3 bg-linear-to-r bg-clip-text pb-1 text-xl font-bold text-transparent md:mb-7 md:text-3xl"
      >
        WIP: {m.nav_database_docs()}
      </div>
    </div>


  </div>
</div>

<div class="text-left container mx-auto p-2">
  <div class="flex place-content-center pb-2">
    <img src="/database/dbdiagram.png" alt="Database Diagram"/>
  </div>

  <h2 class="text-2xl pb-2">Terminology</h2> <hr>

  <table class="table">
    <thead>
      <tr>
        <th>Term</th>
        <th>Definition</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Leftover</td>
        <td>Pieces from the bag from the previous PC. Ex: TSZ to solve PCO and have the leftover ILJO on 2nd</td>
      </tr>
      <tr>
        <td>Build</td>
        <td>Pieces within the setup</td>
      </tr>
      <tr>
        <td>Cover Pattern</td>
        <td><a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/ExtendedSfinderPieces" target="_blank">Extended pieces</a> stating the when to build the setup. Ex: OQB may need S before Z for next step</td>
      </tr>
      <tr>
        <td>Solve Pattern</td>
        <td><a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/ExtendedSfinderPieces" target="_blank">Extended pieces</a> stating what pieces to solve. May be related to cover pattern if cover pattern depends on pieces not in build</td>
      </tr>
    </tbody>
  </table>
  

  <h2 class="text-2xl pb-2">Setup ID</h2> <hr>
  <h3 class="text-xl py-1">Goals</h3>
  <ul class="list-disc">
    <li class="ml-8">Effective order</li>
    <li class="ml-8">Representative of setup</li>
    <li class="ml-8">Uniqueness</li>
  </ul>

  <h3 class="text-xl py-1">Specification</h3>

  <div class="flex place-content-center pb-2">
    <img src="/database/setupid.png" alt="Setup ID Diagram"/>
  </div>

  <p>The ID is a packed 48 bit hex string. Ex: <code class="inline">25b2eefaccff</code></p>

  <p>The order of the packed data determines the order and grouping of the setups when sorted. For this database, the order of <code class="inline">TILJSZO</code> is used for pieces.</p>

  <table class="table">
    <thead>
      <tr>
        <th>Section</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>PC Number</td>
        <td>1-9 value corresponding to 1st to 9th PC</td>
      </tr>
      <tr>
        <td>OQB</td>
        <td>Flag whether the setup is OQB setup</td>
      </tr>
      <tr>
        <td>Duplicate Piece</td>
        <td>Maps duplicate leftover piece to 0-7. No duplicate -> <code class="inline">0</code>, <code class="inline">T</code> -> 1, &hellip;, and <code class="inline">O</code> -> 7</td>
      </tr>
      <tr>
        <td>Leftover Pieces</td>
        <td>Inverted bitmap of existance of each piece in leftover in <code class="inline">TILJSZO</code> order</td>
      </tr>
      <tr>
        <td>Solve Length</td>
        <td>Number of pieces needed to solve. Equivalent to 10 - build length</td>
      </tr>
      <tr>
        <td>4x</td>
        <td>Flag whether there is 4 duplicate pieces in build</td>
      </tr>
      <tr>
        <td>Build Pieces</td>
        <td>Inverted counts of each piece in build in <code class="inline">TILJSZO</code> order with two bits per piece</td>
      </tr>
      <tr>
        <td>Fumen Hash</td>
        <td>Hash of the fumen into four bits</td>
      </tr>
      <tr>
        <td>Cover Hash</td>
        <td>Hash of the cover pattern into two bits</td>
      </tr>
      <tr>
        <td>Unique ID</td>
        <td>Decrement from 255 in case of collision for uniqueness</td>
      </tr>
    </tbody>
  </table>

  <h4 class="text-lg pb-2">Hashing Functions</h4>

  <Hash />

  <p>These hash functions were based on <code class="inline">xor</code> of the characters in the strings. Modifications were made based on the <a class="text-blue-600 hover:text-blue-800" href="https://en.wikipedia.org/wiki/Diversity_index#Shannon_index" target="_blank">entropy</a> of the output leading to the above functions.</p>
  <p>The cover hash is intended to distribute setups with same values except cover pattern for use case such as QB setups, so entropy is calculated on sets of these kinds of setups. However, there is likely bias as arbitary modifications were made to increase specifically the entropies of these sets of setups as few sets in original dataset. The entropies were normalized by dividing by the maximium value, which is same as number of bits in hash: 4 for fumen hash and 2 for cover hash.</p>

  <table class="table">
    <thead>
      <tr>
        <th>Group</th>
        <th>Count</th>
        <th>Entropy (Normalized)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>All Original Fumens</td>
        <td>4109</td>
        <td>0.9979379436338721</td>
      </tr>
      <tr>
        <td>All One Piece Fumens</td>
        <td>162</td>
        <td>0.9806935374824224</td>
      </tr>
      <tr>
        <td>Setups starting with 50f2eff6f[0-3]</td>
        <td>7</td>
        <td>0.9751060324573734</td>
      </tr>
      <tr>
        <td>Setups starting with 50f2eff6f[4-7]</td>
        <td>7</td>
        <td>0.9751060324573734</td>
      </tr>
    </tbody>
  </table>
  
  <h3 class="text-xl py-1">Example</h3>

  <table class="table">
    <thead>
      <tr>
        <th>PC Number</th>
        <th>Leftover</th>
        <th>Build</th>
        <th>Cover Pattern</th>
        <th>Fumen</th>
        <th>OQB</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>2nd</td>
        <td>TTIO</td>
        <td>TIO</td>
        <td>T,[TIO]!</td>
        <td>v115@9gwhIewhIewhEewwAeRpwhDeywRpJeAgH</td>
        <td>false</td>
      </tr>
    </tbody>
  </table>

  <h4>Detailed Conversion</h4>
  
  <table class="table">
    <thead>
      <tr>
        <th>Section</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>PC Number</td>
        <td>2nd -> 2 = <code>0010<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>OQB</td>
        <td>Not OQB -> <code>0<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Duplicate Piece</td>
        <td>TTIO has T as duplicate piece. T -> 1 = <code>001<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Leftover Pieces</td>
        <td>TTIO has the pieces TIO -> 1st, 2nd and 7th bit unset = <code>0011110<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Solve Length</td>
        <td>Build TIO has 3 pieces. 10 - 3 = 7 = <code>0111<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>4x</td>
        <td>No 4 duplicate piece in build -> <code>0<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Build Pieces</td>
        <td>Build TIO has 1 T, 1 I, and 1 O. Computing bitwise NOT or decrement from 3 gives <code>10<sub>2</sub></code> for TIO subsection and <code>11<sub>2</sub></code> for LJSZ subsection -> <code>10101111111110<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Fumen Hash</td>
        <td>Run <code>fumen_hash</code> on the fumen to get 4 = <code>0100<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Cover Hash</td>
        <td>Run <code>cover_pattern_hash</code> on the cover pattern to get 1 = <code>01<sub>2</sub></code></td>
      </tr>
      <tr>
        <td>Unique ID</td>
        <td>No other existing setups in original dataset conflict for first 40 bits -> 255 = <code>11111111<sub>2</sub></code></td>
      </tr>
    </tbody>
  </table>

  <p>Convert to hex: <code>001000010011110011101010111111111001000111111111<sub>2</sub></code> -> <code>213ceaff91ff<sub>16</sub></code></p>

  <h2 class="text-2xl py-2">OQB</h2> <hr>
  <p>The <code>oqb_path</code> and <code>oqb_depth</code> help with handling OQB setups. If a setup is not OQB, <code>oqb_path</code> and <code>oqb_depth</code> are <code>NULL</code></p>
  <p>On insert, the <code>oqb_path</code> may be set to the same value as <code>setup_id</code> to state setup is OQB. This is only necessary when setting <code>solve_pattern</code> to be <code>NULL</code> for setups that aren't intended to be solve but rather has a next setup.</p>

  <p>The <code>oqb_path</code> is automatically populated as a <a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/ExtendedSfinderPieces" target="_blank">materialized/label path</a> from the <code>setup_oqb_links</code> table that contain the parent/previous setup for each setup. Similarly, <code>oqb_depth</code> is automatically populated for depth of the setup, equivalently the number of ancestor setups/nodes.</p>

  <h2 class="text-2xl py-2">Cover Pattern</h2> <hr>

  <p>The cover pattern is in <a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/ExtendedSfinderPieces" target="_blank">extended pieces</a> notation and used to restrict what queues that the setup covers.</p>
  <p>The cover pattern does not need to be exactly the correct coverage. The <code>cover_data</code> in statistics is a bitstring for which queue the setup is covered.</p>

  <h2 class="text-2xl py-2">Setup Variants</h2> <hr>

  <p>Some setups, especially one-solve or QB setups, have effectively the same setup but some pieces may be placed before completing the base setup.</p>

  <p>In the following image, the first page, page with least number of pieces, is the base setup. To increase the coverage of this setup, the S or O piece can be placed before finishing the base setup. These base setups with extraneous pieces are call variants of the setup.</p>

  <div class="flex place-content-center pb-2">
    <img src="/database/variable_setup.gif" alt="Setups with S and O being extraneous to the base setup"/>
  </div>

  <h2 class="text-2xl py-2">Statistics Table</h2> <hr>

  <p>Since the values of a setup depends on the kicktable or have 180, this table separates the statistics for each kicktable.</p>

  <table class="table">
    <thead>
      <tr>
        <th>Kicktable</th>
        <th>Definition</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>srs</td>
        <td>Super Rotation System from The Tetris Company</td>
      </tr>
      <tr>
        <td>srs_plus</td>
        <td>Tetrio's kicktable: srs with symmetric I spins and 180</td>
      </tr>
      <tr>
        <td>srs180</td>
        <td>srs with 180 spins</td>
      </tr>
      <tr>
        <td>none</td>
        <td>No kicks or 180 spins</td>
      </tr>
      <tr>
        <td>srsx</td>
        <td>Tetrio's kicktable: srs with more powerful 180 spins</td>
      </tr>
      <tr>
        <td>ars</td>
        <td>Arika Rotation System</td>
      </tr>
      <tr>
        <td>arc</td>
        <td>Kicktable made for <a class="text-blue-600 hover:text-blue-800" href="https://asc.winternebs.com/" target="_blank">Ascension</a> supported in Tetrio</td>
      </tr>
      <tr>
        <td><a class="text-blue-600 hover:text-blue-800" href="https://github.com/tetrio/issues/issues/310" target="_blank">tetrax</a></td>
        <td>Kicktable made for <a class="text-blue-600 hover:text-blue-800" href="https://tetralegends.app/" target="_blank">Tetris Legends</a> supported in Tetrio</td>
      </tr>
    </tbody>
  </table>
  
  <h2 class="text-2xl py-2">Path File</h2> <hr>

  <p>The <code>path_file</code> is a flag whether the <code>path.csv</code> file is stored on the server.</p>

  <p>The file is stored with the filename <code>&lt;setup-id&gt;-&lt;kicktable&gt;.csvd.xz</code>, which is a compressed version of the file.</p>

  <p>The basic idea on how to compress the file is to have the fumens keyed by a number then store the mapping at the beginning. In addition, remove columns that can be computed from the other columns, which the queues can be compressed into the extended pieces notation that generated it at the beginning of the file. Then apply <code>xz</code> or the underlying <code>lzma</code> for compression of the file. This converts the 1-3 MB file into 5-150 KB file.</p>

  <p>The following function is the actual implementation.</p>

  <Path />

  <h2 class="text-2xl py-2">Saves Table</h2> <hr>

  <p>This table is to store save data following the notation used in <a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/PC-Saves-Get" target="_blank">PC-Saves-Get</a> stored in <code>save</code> column.</p>

  <p>Priority save percent/fraction is values in an array of the priority of that save. Ex: <code>T,I,O</code> on 2nd and wanted to know percent of getting <code>T</code> then remaining percent for <code>I</code> then <code>O</code>. This corresponds with the <code>--best-save</code> flag on <a class="text-blue-600 hover:text-blue-800" href="https://github.com/Marfung37/PC-Saves-Get" target="_blank">PC-Saves-Get</a></p>

  

</div>
