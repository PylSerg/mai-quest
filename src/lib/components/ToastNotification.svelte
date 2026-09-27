<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppNotification } from '$lib/stores/notifications.svelte';

	interface Props {
		notification: AppNotification;
		onDismiss: (id: string) => void;
	}

	let { notification, onDismiss }: Props = $props();

	let showDetails = $state(false);
	let isRetrying = $state(false);
	let progress = $state(100);
	let timer: ReturnType<typeof setInterval> | null = null;

	onMount(() => {
		if (notification.autoDismissMs && notification.autoDismissMs > 0) {
			const start = Date.now();
			const total = notification.autoDismissMs;
			timer = setInterval(() => {
				const elapsed = Date.now() - start;
				progress = Math.max(0, 100 - (elapsed / total) * 100);
				if (elapsed >= total) {
					if (timer) clearInterval(timer);
					onDismiss(notification.id);
				}
			}, 100);
		}

		return () => {
			if (timer) clearInterval(timer);
		};
	});

	async function handleRetry() {
		if (!notification.retry || isRetrying) return;
		isRetrying = true;
		try {
			await notification.retry();
			onDismiss(notification.id);
		} catch (e) {
			console.error('Retry failed:', e);
		} finally {
			isRetrying = false;
		}
	}
</script>

<div
	class="toast-card"
	class:is-503={notification.is503}
	class:is-error={notification.type === 'error'}
	class:is-warning={notification.type === 'warning'}
	class:is-success={notification.type === 'success'}
	class:is-info={notification.type === 'info'}
	role="alert"
	aria-live="assertive"
>
	<div class="toast-header">
		<div class="toast-title-wrap">
			<span class="toast-icon">
				{#if notification.is503}
					⚠️
				{:else if notification.type === 'error'}
					❌
				{:else if notification.type === 'warning'}
					⚠️
				{:else if notification.type === 'success'}
					✅
				{:else}
					ℹ️
				{/if}
			</span>
			<span class="toast-title">{notification.title}</span>
			{#if notification.status}
				<span class="status-badge" class:badge-503={notification.is503}>
					{notification.status}
				</span>
			{/if}
		</div>
		<button
			class="btn-close"
			onclick={() => onDismiss(notification.id)}
			aria-label="Закрити сповіщення"
			title="Закрити"
		>
			✕
		</button>
	</div>

	<div class="toast-body">
		<p class="toast-message">{notification.message}</p>

		{#if notification.is503}
			<div class="overload-hint">
				💡 <strong>Порада при 503:</strong> Модель Google перевантажена через велику кількість запитів. Зачекайте 5-10 секунд і натисніть кнопку нижче.
			</div>
		{/if}

		{#if showDetails && (notification.details || notification.statusText)}
			<div class="toast-details">
				{#if notification.statusText}
					<div class="detail-row"><strong>HTTP Статус:</strong> {notification.statusText}</div>
				{/if}
				{#if notification.details}
					<pre class="detail-pre">{notification.details}</pre>
				{/if}
			</div>
		{/if}
	</div>

	<div class="toast-footer">
		<div class="actions-left">
			{#if notification.retry}
				<button class="btn-toast-retry" onclick={handleRetry} disabled={isRetrying}>
					{#if isRetrying}
						<span class="spinner"></span>
						<span>Повторення...</span>
					{:else}
						<span>🔄 Спробувати знову</span>
					{/if}
				</button>
			{/if}
			{#if notification.details || notification.statusText}
				<button
					class="btn-toast-details"
					onclick={() => (showDetails = !showDetails)}
				>
					{showDetails ? 'Приховати деталі' : '📋 Деталі'}
				</button>
			{/if}
		</div>
	</div>

	{#if notification.autoDismissMs && notification.autoDismissMs > 0}
		<div class="progress-bar-wrap">
			<div class="progress-bar" style="width: {progress}%"></div>
		</div>
	{/if}
</div>

<style>
	.toast-card {
		background: var(--panel-bg, #1e1e24);
		color: var(--text-color, #e2e2e8);
		border: 1px solid var(--border-color, #2e2e38);
		border-radius: 12px;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.2);
		padding: 14px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		position: relative;
		overflow: hidden;
		transition: all 0.2s ease;
		backdrop-filter: blur(10px);
		max-width: 440px;
		width: 100%;
		animation: slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateY(-12px) scale(0.97);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	.toast-card.is-503 {
		border-color: #f59e0b;
		box-shadow: 0 0 24px rgba(245, 158, 11, 0.25), 0 12px 32px rgba(0, 0, 0, 0.5);
		background: linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, var(--panel-bg, #1e1e24) 100%);
	}

	.toast-card.is-error:not(.is-503) {
		border-color: #ef4444;
		box-shadow: 0 0 20px rgba(239, 68, 68, 0.2), 0 12px 32px rgba(0, 0, 0, 0.45);
	}

	.toast-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
	}

	.toast-title-wrap {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.toast-icon {
		font-size: 18px;
		line-height: 1;
	}

	.toast-title {
		font-weight: 700;
		font-size: 14px;
		letter-spacing: -0.01em;
	}

	.status-badge {
		font-size: 11px;
		font-weight: 700;
		padding: 2px 7px;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: var(--text-color);
	}

	.status-badge.badge-503 {
		background: rgba(245, 158, 11, 0.2);
		border-color: #f59e0b;
		color: #fbbf24;
	}

	.btn-close {
		background: transparent;
		border: none;
		color: var(--text-dim, #a0a0b0);
		font-size: 14px;
		padding: 4px 6px;
		cursor: pointer;
		border-radius: 4px;
		line-height: 1;
		transition: background 0.15s, color 0.15s;
	}

	.btn-close:hover {
		background: rgba(255, 255, 255, 0.1);
		color: var(--text-color, #e2e2e8);
	}

	.toast-body {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.toast-message {
		font-size: 13.5px;
		line-height: 1.45;
		color: var(--text-color, #e2e2e8);
		margin: 0;
	}

	.overload-hint {
		font-size: 12px;
		line-height: 1.4;
		padding: 8px 10px;
		background: rgba(245, 158, 11, 0.12);
		border-left: 3px solid #f59e0b;
		border-radius: 4px;
		color: #fcd34d;
	}

	.toast-details {
		margin-top: 4px;
		padding: 8px 10px;
		background: rgba(0, 0, 0, 0.35);
		border-radius: 6px;
		font-size: 11.5px;
		max-height: 160px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		color: var(--text-dim, #a0a0b0);
	}

	.detail-pre {
		margin: 0;
		white-space: pre-wrap;
		word-break: break-all;
		font-family: monospace;
		font-size: 11px;
		color: #e2e8f0;
	}

	.toast-footer {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: 2px;
	}

	.actions-left {
		display: flex;
		align-items: center;
		gap: 8px;
		flex-wrap: wrap;
	}

	.btn-toast-retry {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: #f59e0b;
		color: #0f172a;
		font-size: 13px;
		font-weight: 700;
		padding: 6px 12px;
		border-radius: 6px;
		border: none;
		cursor: pointer;
		transition: background 0.15s, transform 0.1s;
	}

	.btn-toast-retry:hover {
		background: #d97706;
		transform: translateY(-1px);
	}

	.btn-toast-retry:active {
		transform: translateY(0);
	}

	.btn-toast-retry:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.btn-toast-details {
		background: transparent;
		border: 1px solid var(--border-color, #2e2e38);
		color: var(--text-dim, #a0a0b0);
		font-size: 12px;
		padding: 5px 10px;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s;
	}

	.btn-toast-details:hover {
		background: rgba(255, 255, 255, 0.06);
		color: var(--text-color, #e2e2e8);
		border-color: var(--text-dim, #a0a0b0);
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

	.progress-bar-wrap {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 3px;
		background: rgba(255, 255, 255, 0.08);
	}

	.progress-bar {
		height: 100%;
		background: var(--accent-color, #7257fa);
		transition: width 0.1s linear;
	}

	.is-503 .progress-bar {
		background: #f59e0b;
	}

	.is-error:not(.is-503) .progress-bar {
		background: #ef4444;
	}
</style>
