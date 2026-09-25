<script lang="ts">
	import { FALLBACK_AVATAR } from '$lib/services/avatar';
	import AvatarLightbox from './AvatarLightbox.svelte';

	interface Props {
		src?: string;
		size?: string;
		charName?: string;
		clickable?: boolean;
	}
	let { src = FALLBACK_AVATAR, size = '36px', charName = 'Персонаж', clickable = true }: Props = $props();

	let loading = $state(true);
	let failed = $state(false);
	let showLightbox = $state(false);

	$effect(() => {
		void src;
		loading = true;
		failed = false;
	});

	const displaySrc = $derived(failed ? FALLBACK_AVATAR : (src || FALLBACK_AVATAR));
	const isFallback = $derived(displaySrc === FALLBACK_AVATAR);

	function handleClick() {
		if (clickable && !isFallback) {
			showLightbox = true;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if ((e.key === 'Enter' || e.key === ' ') && clickable && !isFallback) {
			showLightbox = true;
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<span
	class="avatar-wrap"
	class:loading
	class:clickable={clickable && !isFallback}
	style="width:{size};height:{size}"
	onclick={handleClick}
	onkeydown={handleKeydown}
	role={clickable && !isFallback ? 'button' : undefined}
	tabindex={clickable && !isFallback ? 0 : undefined}
	aria-label={clickable && !isFallback ? `Відкрити аватар ${charName}` : undefined}
	title={clickable && !isFallback ? `Переглянути аватар ${charName}` : undefined}
>
	<span class="avatar-spinner"></span>
	<img
		src={displaySrc}
		class="char-avatar"
		style="width:{size};height:{size}"
		alt="avatar"
		onload={() => (loading = false)}
		onerror={() => {
			failed = true;
			loading = false;
		}}
	/>
</span>

{#if showLightbox}
	<AvatarLightbox src={displaySrc} {charName} onClose={() => (showLightbox = false)} />
{/if}

<style>
	.avatar-wrap {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
	}
	.avatar-wrap.clickable {
		cursor: zoom-in;
		outline: none;
	}
	.avatar-wrap.clickable:hover .char-avatar {
		border-color: var(--accent-color);
		filter: brightness(1.1);
		transform: scale(1.05);
	}
	.avatar-wrap.clickable:focus-visible .char-avatar {
		outline: 2px solid var(--accent-color);
		outline-offset: 2px;
	}
	.char-avatar {
		border-radius: 50%;
		object-fit: cover;
		background: #333;
		border: 2px solid var(--accent-color);
		opacity: 1;
		transition: opacity 0.2s ease, transform 0.2s ease, filter 0.2s ease, border-color 0.2s ease;
	}
	.avatar-wrap.loading .char-avatar {
		opacity: 0;
	}
	.avatar-spinner {
		position: absolute;
		inset: 0;
		border-radius: 50%;
		border: 3px solid var(--border-color);
		border-top-color: var(--accent-color);
		opacity: 0;
		pointer-events: none;
		box-sizing: border-box;
	}
	.avatar-wrap.loading .avatar-spinner {
		opacity: 1;
		animation: avatarSpin 0.8s linear infinite;
	}
	@keyframes avatarSpin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
