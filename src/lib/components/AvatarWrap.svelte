<script lang="ts">
	import { FALLBACK_AVATAR } from '$lib/services/avatar';

	interface Props {
		src?: string;
		size?: string;
	}
	let { src = FALLBACK_AVATAR, size = '36px' }: Props = $props();

	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		void src;
		loading = true;
		failed = false;
	});

	const displaySrc = $derived(failed ? FALLBACK_AVATAR : (src || FALLBACK_AVATAR));
</script>

<span class="avatar-wrap" class:loading style="width:{size};height:{size}">
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

<style>
	.avatar-wrap {
		position: relative;
		display: inline-block;
		flex-shrink: 0;
	}
	.char-avatar {
		border-radius: 50%;
		object-fit: cover;
		background: #333;
		border: 2px solid var(--accent-color);
		opacity: 1;
		transition: opacity 0.2s ease;
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
