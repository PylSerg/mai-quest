<script lang="ts">
	import { notificationStore, clearChatError } from '$lib/stores/notifications.svelte';

	let showDetails = $state(false);
	let isRetrying = $state(false);

	const error = $derived(notificationStore.chatError);

	async function handleRetry() {
		if (!error?.retry || isRetrying) return;
		isRetrying = true;
		try {
			await error.retry();
		} catch (e) {
			console.error('Retry failed:', e);
		} finally {
			isRetrying = false;
		}
	}
</script>

{#if error}
	<div
		class="chat-error-banner"
		class:is-503={error.is503}
		class:is-warning={error.type === 'warning'}
		role="alert"
	>
		<div class="banner-main">
			<div class="banner-left">
				<span class="banner-icon">{error.is503 ? '⚠️' : '❌'}</span>
				<div class="banner-texts">
					<div class="banner-headline">
						<strong>{error.title}</strong>
						{#if error.status}
							<span class="status-pill" class:pill-503={error.is503}>
								{error.is503 ? 'HTTP 503 • OVERLOADED' : `HTTP ${error.status}`}
							</span>
						{/if}
					</div>
					<div class="banner-message">{error.message}</div>
				</div>
			</div>

			<div class="banner-actions">
				{#if error.retry}
					<button class="btn-banner-retry" onclick={handleRetry} disabled={isRetrying}>
						{#if isRetrying}
							<span class="spinner"></span>
							<span>Повторюємо...</span>
						{:else}
							<span>🔄 Спробувати знову</span>
						{/if}
					</button>
				{/if}
				{#if error.details}
					<button
						class="btn-banner-toggle"
						onclick={() => (showDetails = !showDetails)}
						title="Переглянути технічні деталі"
					>
						{showDetails ? 'Сховати' : 'Деталі'}
					</button>
				{/if}
				<button class="btn-banner-close" onclick={clearChatError} title="Закрити">
					✕
				</button>
			</div>
		</div>

		{#if showDetails && error.details}
			<div class="banner-details">
				<pre>{error.details}</pre>
			</div>
		{/if}
	</div>
{/if}

<style>
	.chat-error-banner {
		background: rgba(239, 68, 68, 0.12);
		border-top: 1px solid rgba(239, 68, 68, 0.4);
		border-bottom: 1px solid rgba(239, 68, 68, 0.4);
		padding: 10px 16px;
		display: flex;
		flex-direction: column;
		gap: 8px;
		color: var(--text-color, #e2e2e8);
		backdrop-filter: blur(8px);
		animation: fadeIn 0.2s ease-out;
		z-index: 10;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.chat-error-banner.is-503 {
		background: rgba(245, 158, 11, 0.14);
		border-color: rgba(245, 158, 11, 0.5);
		box-shadow: inset 0 1px 0 rgba(245, 158, 11, 0.25);
	}

	.banner-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		flex-wrap: wrap;
	}

	.banner-left {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		flex: 1;
		min-width: 240px;
	}

	.banner-icon {
		font-size: 20px;
		line-height: 1.2;
		flex-shrink: 0;
	}

	.banner-texts {
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.banner-headline {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 13.5px;
		font-weight: 600;
	}

	.status-pill {
		font-size: 10.5px;
		font-weight: 700;
		padding: 1px 6px;
		border-radius: 4px;
		background: rgba(239, 68, 68, 0.2);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #f87171;
		letter-spacing: 0.02em;
	}

	.status-pill.pill-503 {
		background: rgba(245, 158, 11, 0.25);
		border-color: #f59e0b;
		color: #fcd34d;
	}

	.banner-message {
		font-size: 12.5px;
		line-height: 1.4;
		color: var(--text-dim, #a0a0b0);
	}

	.banner-actions {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-shrink: 0;
	}

	.btn-banner-retry {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #f59e0b;
		color: #0f172a;
		font-size: 12.5px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}

	.btn-banner-retry:hover {
		background: #d97706;
		transform: translateY(-1px);
	}

	.btn-banner-retry:active {
		transform: translateY(0);
	}

	.btn-banner-retry:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-banner-toggle {
		background: transparent;
		border: 1px solid var(--border-color, #2e2e38);
		color: var(--text-dim, #a0a0b0);
		font-size: 12px;
		padding: 5px 9px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-banner-toggle:hover {
		color: var(--text-color, #e2e2e8);
		background: rgba(255, 255, 255, 0.06);
	}

	.btn-banner-close {
		background: transparent;
		border: none;
		color: var(--text-dim, #a0a0b0);
		font-size: 14px;
		padding: 5px 8px;
		cursor: pointer;
		border-radius: 4px;
		line-height: 1;
	}

	.btn-banner-close:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-color, #e2e2e8);
	}

	.banner-details {
		background: rgba(0, 0, 0, 0.35);
		border-radius: 6px;
		padding: 8px 10px;
		max-height: 120px;
		overflow-y: auto;
		font-size: 11px;
	}

	.banner-details pre {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
		font-family: monospace;
		color: #e2e8f0;
	}

	.spinner {
		width: 12px;
		height: 12px;
		border: 2px solid rgba(15, 23, 42, 0.3);
		border-top-color: #0f172a;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
