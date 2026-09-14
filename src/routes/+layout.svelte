<script lang="ts">
	import { pwaInfo } from "virtual:pwa-info";
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import "../app.css";

	let { children } = $props();

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import("virtual:pwa-register");
			registerSW({
				immediate: true,
				onRegistered(r) {
					console.log("SW Registered:", r);
				},
				onRegisterError(error) {
					console.log("SW Registration error:", error);
				},
			});
		}
	});

	let webManifestLink = pwaInfo ? pwaInfo.webManifest : "";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>My AI Quest</title>
	{@html webManifestLink}
</svelte:head>

{@render children()}
