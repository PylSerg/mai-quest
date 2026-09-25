<script lang="ts">
	import { FALLBACK_AVATAR } from '$lib/services/avatar';

	interface Props {
		src: string;
		onClose: () => void;
		charName?: string;
	}
	let { src, onClose, charName = 'Персонаж' }: Props = $props();

	function onBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) onClose();
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onClose();
	}

	let imgFailed = $state(false);
	const displaySrc = $derived(imgFailed ? FALLBACK_AVATAR : src);
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="lightbox-backdrop"
	role="dialog"
	aria-modal="true"
	aria-label="Перегляд аватара"
	onkeydown={onKeydown}
	onclick={onBackdropClick}
	tabindex="-1"
>
	<div class="lightbox-content">
		<button class="lightbox-close" onclick={onClose} title="Закрити">✕</button>
		<img
			src={displaySrc}
			alt={charName}
			class="lightbox-img"
			onerror={() => (imgFailed = true)}
		/>
		<div class="lightbox-name">{charName}</div>
	</div>
</div>

<style>
	.lightbox-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1100;
		background: rgba(0, 0, 0, 0.85);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
		animation: lbFadeIn 0.18s ease;
		cursor: zoom-out;
	}
	@keyframes lbFadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.lightbox-content {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		animation: lbZoomIn 0.22s cubic-bezier(0.175, 0.885, 0.32, 1.275);
		cursor: default;
	}
	@keyframes lbZoomIn {
		from { transform: scale(0.85); opacity: 0; }
		to { transform: none; opacity: 1; }
	}
	.lightbox-img {
		max-width: min(520px, 90vw);
		max-height: 75vh;
		width: auto;
		height: auto;
		border-radius: 14px;
		border: 2px solid var(--accent-color, #7c6cfc);
		box-shadow: 0 30px 80px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.05);
		object-fit: contain;
		display: block;
	}
	.lightbox-name {
		color: rgba(255, 255, 255, 0.85);
		font-size: 15px;
		font-weight: 600;
		letter-spacing: 0.03em;
		text-shadow: 0 1px 4px rgba(0,0,0,0.5);
	}
	.lightbox-close {
		position: absolute;
		top: -14px;
		right: -14px;
		width: 34px;
		height: 34px;
		border-radius: 50%;
		background: var(--panel-bg, #1a1a2e);
		border: 1px solid var(--border-color, #444);
		color: var(--text-dim, #aaa);
		font-size: 16px;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s;
		z-index: 1;
		font-weight: normal;
	}
	.lightbox-close:hover {
		background: var(--accent-color, #7c6cfc);
		border-color: var(--accent-color, #7c6cfc);
		color: #fff;
	}
</style>
