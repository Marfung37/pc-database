<script lang="ts">
  import '../../app.css';

	// Import necessary functions from Paraglide's runtime
	import {
		getLocale, // Get the current active locale
		locales,   // Get an array of all available locales (e.g., ['en', 'de', 'fr'])
		setLocale, // Function to change the locale
	} from '$lib/paraglide/runtime'; // Adjust this path if your Paraglide output directory is different

	// You might want a mapping for display names if your locale codes are not user-friendly
	const LOCALE_DISPLAY_NAMES: Record<string, string> = {
		'en': 'English',
		'jp': '日本語',
		// Add all your configured locales here
	};

	// Get the currently active locale for the dropdown's default selection
	let currentLocale = getLocale();

	// Function to handle locale change
	function handleLocaleChange(event: Event) {
		const selectElement = event.target as HTMLSelectElement;
		const newLocale = selectElement.value;

		if (newLocale && locales.includes(newLocale)) {
			setLocale(newLocale);
		}
	}
</script>

<div class="relative inline-block text-left">
	<label for="locale-select" class="sr-only">Select Language</label>
	<select
		id="locale-select"
		on:change={handleLocaleChange}
		bind:value={currentLocale}
		class="block appearance-none w-full bg-white border border-gray-300 hover:border-gray-400 px-4 py-2 pr-8 rounded shadow leading-tight focus:outline-none focus:shadow-outline"
	>
		{#each locales.filter((x) => x in LOCALE_DISPLAY_NAMES) as locale}
			<option value={locale}>
				{LOCALE_DISPLAY_NAMES[locale]}
			</option>
		{/each}
	</select>
</div>
