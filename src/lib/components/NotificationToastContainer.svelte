<script lang="ts">
	import {
		notificationStore,
		dismissNotification
	} from '$lib/stores/notifications.svelte';
	import ToastNotification from './ToastNotification.svelte';
</script>

{#if notificationStore.notifications.length > 0}
	<div class="toast-container" aria-live="polite">
		{#each notificationStore.notifications as notification (notification.id)}
			<ToastNotification {notification} onDismiss={dismissNotification} />
		{/each}
	</div>
{/if}

<style>
	.toast-container {
		position: fixed;
		top: 16px;
		right: 16px;
		z-index: 9999;
		display: flex;
		flex-direction: column;
		gap: 10px;
		max-width: 440px;
		width: calc(100vw - 32px);
		pointer-events: none;
	}

	.toast-container :global(.toast-card) {
		pointer-events: auto;
	}

	@media (max-width: 600px) {
		.toast-container {
			top: 10px;
			right: 10px;
			left: 10px;
			width: auto;
			max-width: none;
		}
	}
</style>
