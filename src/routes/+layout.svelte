<script lang="ts">
	import { pwaInfo } from "virtual:pwa-info";
	import { onMount } from "svelte";
	import favicon from "$lib/assets/favicon.svg";
	import NotificationToastContainer from "$lib/components/NotificationToastContainer.svelte";
	import { reportError } from "$lib/stores/notifications.svelte";
	import "../app.css";

	let { children } = $props();

	onMount(() => {
		const handleError = (event: ErrorEvent) => {
			console.error("Global window error:", event.error || event.message);
			reportError(event.error || event.message, { title: "Помилка виконання" });
		};

		const handleRejection = (event: PromiseRejectionEvent) => {
			console.error("Unhandled promise rejection:", event.reason);
			reportError(event.reason, { title: "Неперехоплена помилка" });
		};

		window.addEventListener("error", handleError);
		window.addEventListener("unhandledrejection", handleRejection);

		if (pwaInfo) {
			import("virtual:pwa-register").then(({ registerSW }) => {
				registerSW({
					immediate: true,
					onRegistered(r) {
						console.log("SW Registered:", r);
					},
					onRegisterError(error) {
						console.log("SW Registration error:", error);
					},
				});
			});
		}

		// Smoothly fade out the splash screen once app mounts
		const splash = document.getElementById("app-splash");
		if (splash) {
			setTimeout(() => {
				splash.style.opacity = "0";
				splash.style.pointerEvents = "none";
				setTimeout(() => splash.remove(), 400);
			}, 300);
		}

		return () => {
			window.removeEventListener("error", handleError);
			window.removeEventListener("unhandledrejection", handleRejection);
		};
	});

	let webManifestLink = pwaInfo ? pwaInfo.webManifest : "";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>My AI Quest</title>
	{@html webManifestLink}
</svelte:head>

{@render children()}

<NotificationToastContainer />
