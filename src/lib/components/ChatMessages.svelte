<script lang="ts">
	import { onMount, tick } from 'svelte';
	import type { Game } from '$lib/types';
	import MessageUser from './MessageUser.svelte';
	import MessageNarration from './MessageNarration.svelte';
	import MessageCharacter from './MessageCharacter.svelte';
	import ActionBar from './ActionBar.svelte';

	const PAGE_SIZE = 50;

	interface Props {
		game: Game;
		isGenerating: boolean;
		currentOptions: string[];
		onEditMessage: (index: number) => void;
		onStartGame: () => void;
		onContinue: () => void;
		onToggleOptions: () => void;
		onSelectOption: (opt: string) => void;
		scrollRef: HTMLDivElement | null;
	}

	let {
		game,
		isGenerating,
		currentOptions,
		onEditMessage,
		onStartGame,
		onContinue,
		onToggleOptions,
		onSelectOption,
		scrollRef = $bindable()
	}: Props = $props();

	let scrollVisible = $state(false);
	let startIndex = $state(-1);
	let currentGameId = $state<number | undefined>(undefined);
	let isLoadingMore = $state(false);
	let isReady = $state(false);
	let prevMessagesLength = $state(-1);
	let prevOptionsCount = $state(0);

	const effectiveStartIndex = $derived(
		startIndex < 0 ? Math.max(0, game.messages.length - PAGE_SIZE) : startIndex
	);

	const visibleMessages = $derived.by(() => {
		return game.messages.slice(effectiveStartIndex);
	});

	const lastUserIdx = $derived.by(() => {
		for (let i = game.messages.length - 1; i >= 0; i--) {
			if (game.messages[i].type === 'user') return i;
		}
		return -1;
	});

	const showActionBar = $derived.by(() => {
		if (!game.isStarted || game.messages.length === 0) return false;
		const last = game.messages[game.messages.length - 1];
		return last.type === 'narration' || last.type === 'character';
	});

	function scrollToElementTop(targetEl: HTMLElement) {
		if (!scrollRef) return;
		const containerRect = scrollRef.getBoundingClientRect();
		const targetRect = targetEl.getBoundingClientRect();
		const targetScrollTop = scrollRef.scrollTop + (targetRect.top - containerRect.top) - 10;
		scrollRef.scrollTo({
			top: Math.max(0, targetScrollTop),
			behavior: 'smooth'
		});
	}

	function handleActionBarToggleOptions() {
		onToggleOptions();
		// If options were closed, we are opening them: smoothly scroll action bar to top
		if (currentOptions.length === 0) {
			tick().then(() => {
				const actionBar = scrollRef?.querySelector('.action-bar-wrap') as HTMLElement | null;
				if (actionBar) {
					scrollToElementTop(actionBar);
				}
			});
		}
	}

	onMount(() => {
		prevMessagesLength = game.messages.length;
		prevOptionsCount = currentOptions.length;
		if (startIndex < 0) {
			startIndex = Math.max(0, game.messages.length - PAGE_SIZE);
		}
		if (scrollRef) {
			scrollRef.scrollTop = scrollRef.scrollHeight;
		}
		requestAnimationFrame(() => {
			if (scrollRef) {
				scrollRef.scrollTop = scrollRef.scrollHeight;
			}
			setTimeout(() => {
				isReady = true;
			}, 100);
		});
	});

	$effect(() => {
		if (game.id !== currentGameId) {
			currentGameId = game.id;
			isReady = false;
			startIndex = Math.max(0, game.messages.length - PAGE_SIZE);
			prevMessagesLength = game.messages.length;
			prevOptionsCount = currentOptions.length;
			tick().then(() => {
				if (scrollRef) {
					scrollRef.scrollTop = scrollRef.scrollHeight;
				}
				setTimeout(() => {
					isReady = true;
				}, 100);
			});
		}
	});

	$effect(() => {
		if (startIndex > game.messages.length) {
			startIndex = Math.max(0, game.messages.length - PAGE_SIZE);
		}
	});

	// Auto-scroll on new messages: user messages scroll to bottom; AI messages align at top
	$effect(() => {
		const currentLength = game.messages.length;
		const prevLen = prevMessagesLength;

		if (!isReady || game.id !== currentGameId) {
			prevMessagesLength = currentLength;
			return;
		}

		if (currentLength > prevLen) {
			const firstNewIdx = prevLen;
			const firstNewMessage = game.messages[firstNewIdx];
			prevMessagesLength = currentLength;

			if (firstNewMessage) {
				if (firstNewMessage.type === 'user') {
					tick().then(() => {
						if (scrollRef) {
							scrollRef.scrollTo({
								top: scrollRef.scrollHeight,
								behavior: 'smooth'
							});
						}
					});
				} else {
					// AI message arrived (from prompt, continue, start game, or option) -> show at the TOP of the screen
					tick().then(() => {
						requestAnimationFrame(() => {
							const targetEl = scrollRef?.querySelector(
								`[data-msg-idx="${firstNewIdx}"]`
							) as HTMLElement | null;
							if (targetEl) {
								scrollToElementTop(targetEl);
							}
						});
					});
				}
			}
		} else {
			prevMessagesLength = currentLength;
		}
	});

	// Auto-scroll on new options: align action bar / options at the top
	$effect(() => {
		const optCount = currentOptions.length;
		const prevOpt = prevOptionsCount;
		prevOptionsCount = optCount;

		if (!isReady || game.id !== currentGameId) return;

		if (optCount > 0 && prevOpt === 0) {
			tick().then(() => {
				requestAnimationFrame(() => {
					const actionBar = scrollRef?.querySelector('.action-bar-wrap') as HTMLElement | null;
					if (actionBar) {
						scrollToElementTop(actionBar);
					}
				});
			});
		}
	});

	async function loadMoreMessages() {
		if (effectiveStartIndex <= 0 || isLoadingMore || !scrollRef) return;
		isLoadingMore = true;

		const prevScrollHeight = scrollRef.scrollHeight;
		const prevScrollTop = scrollRef.scrollTop;

		startIndex = Math.max(0, effectiveStartIndex - PAGE_SIZE);

		await tick();

		if (scrollRef) {
			const heightDiff = scrollRef.scrollHeight - prevScrollHeight;
			scrollRef.scrollTop = prevScrollTop + heightDiff;
		}

		setTimeout(() => {
			isLoadingMore = false;
		}, 150);
	}

	function onScroll(e: Event) {
		const el = e.target as HTMLDivElement;
		const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
		scrollVisible = dist > 80;

		if (isReady && el.scrollTop <= 80 && effectiveStartIndex > 0 && !isLoadingMore) {
			loadMoreMessages();
		}
	}

	function scrollToBottom() {
		scrollRef?.scrollTo({ top: scrollRef.scrollHeight, behavior: 'smooth' });
	}

	export function scrollToPos(mode: 'bottom' | 'top' | 'preserve', prevTop = 0) {
		if (!scrollRef) return;
		if (mode === 'bottom') scrollRef.scrollTop = scrollRef.scrollHeight;
		else if (mode === 'top') scrollRef.scrollTop = 0;
		else scrollRef.scrollTop = prevTop;
	}
</script>

<div class="chat-messages-wrapper">
	<div class="chat-messages" bind:this={scrollRef} onscroll={onScroll}>
		{#if effectiveStartIndex > 0}
			<div class="load-more-wrap">
				<button
					class="btn-load-more"
					onclick={loadMoreMessages}
					disabled={isLoadingMore}
					aria-label="Завантажити попередні повідомлення"
				>
					{#if isLoadingMore}
						<span class="spinner-inline"></span>
						<span>Завантаження...</span>
					{:else}
						<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
							<path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
						</svg>
						<span>Показати попередні повідомлення ({Math.min(effectiveStartIndex, PAGE_SIZE)})</span>
					{/if}
				</button>
			</div>
		{/if}

		{#each visibleMessages as message, i (effectiveStartIndex + i)}
			{@const actualIdx = effectiveStartIndex + i}
			{#if message.type === 'user'}
				<MessageUser
					{message}
					{game}
					isLast={actualIdx === lastUserIdx}
					onEdit={() => onEditMessage(actualIdx)}
					msgIdx={actualIdx}
				/>
			{:else if message.type === 'narration'}
				<MessageNarration {message} msgIdx={actualIdx} />
			{:else if message.type === 'character'}
				<MessageCharacter {message} {game} msgIdx={actualIdx} />
			{/if}
		{/each}

		{#if showActionBar}
			<div class="action-bar-wrap">
				<ActionBar
					options={currentOptions}
					{onContinue}
					onToggleOptions={handleActionBarToggleOptions}
					{onSelectOption}
				/>
			</div>
		{/if}

		{#if !game.isStarted}
			<div class="start-btn-wrap">
				<button class="btn-start" onclick={onStartGame}>▶ Почати гру</button>
			</div>
		{/if}
	</div>

	<button
		class="btn-scroll-bottom"
		class:visible={scrollVisible}
		onclick={scrollToBottom}
		title="Прокрутити донизу"
	>
		<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
			<path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
		</svg>
	</button>
</div>

<style>
	.chat-messages-wrapper {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		min-height: 0;
		overflow: hidden;
	}
	.chat-messages {
		flex: 1;
		padding: 20px 20px min(50vh, 320px) 20px;
		overflow-y: auto;
		overflow-anchor: none;
		display: flex;
		flex-direction: column;
		gap: 15px;
		min-height: 0;
	}
	.action-bar-wrap {
		display: flex;
		flex-direction: column;
		width: 100%;
	}
	.load-more-wrap {
		display: flex;
		justify-content: center;
		padding: 4px 0 10px 0;
	}
	.btn-load-more {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		color: var(--text-dim);
		font-size: 13px;
		font-weight: 500;
		padding: 6px 16px;
		border-radius: 20px;
		cursor: pointer;
		transition: all 0.2s ease;
	}
	.btn-load-more:hover:not(:disabled) {
		background: var(--panel-bg);
		color: var(--text-color);
		border-color: var(--accent-color);
	}
	.btn-load-more:disabled {
		opacity: 0.7;
		cursor: default;
	}
	.spinner-inline {
		width: 14px;
		height: 14px;
		border: 2px solid var(--border-color);
		border-top-color: var(--accent-color);
		border-radius: 50%;
		animation: spin 0.7s linear infinite;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	:global(.chat-messages .message) {
		padding: 12px 16px;
		border-radius: 8px;
		max-width: 90%;
		line-height: 1.5;
		word-break: break-word;
		display: flex;
		flex-direction: column;
		gap: 8px;
		font-size: 17px;
		position: relative;
	}
	@media (max-width: 768px) {
		:global(.chat-messages .message) { max-width: 95%; }
	}
	.start-btn-wrap {
		display: flex;
		justify-content: center;
		margin: 20px 0;
	}
	.btn-start {
		padding: 12px 24px;
		font-size: 16px;
	}
	.btn-scroll-bottom {
		position: absolute;
		right: 20px;
		bottom: 20px;
		width: 42px;
		height: 42px;
		border-radius: 50%;
		background: var(--panel-bg);
		border: 1px solid var(--border-color);
		color: var(--accent-color);
		box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: 50;
		opacity: 0;
		pointer-events: none;
		transform: translateY(12px) scale(0.9);
		transition:
			opacity 0.25s ease,
			transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275),
			background 0.2s,
			color 0.2s,
			border-color 0.2s;
		font-weight: normal;
	}
	.btn-scroll-bottom.visible {
		opacity: 1;
		pointer-events: auto;
		transform: translateY(0) scale(1);
	}
	.btn-scroll-bottom:hover {
		background: var(--accent-color);
		color: #ffffff;
		border-color: var(--accent-color);
	}
</style>
