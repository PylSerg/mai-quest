<script lang="ts">
	import type { Game } from '$lib/types';
	import MessageUser from './MessageUser.svelte';
	import MessageNarration from './MessageNarration.svelte';
	import MessageCharacter from './MessageCharacter.svelte';
	import ActionBar from './ActionBar.svelte';

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

	function onScroll(e: Event) {
		const el = e.target as HTMLDivElement;
		const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
		scrollVisible = dist > 80;
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
		{#each game.messages as message, idx (idx)}
			{#if message.type === 'user'}
				<MessageUser
					{message}
					{game}
					isLast={idx === lastUserIdx}
					onEdit={() => onEditMessage(idx)}
				/>
			{:else if message.type === 'narration'}
				<MessageNarration {message} />
			{:else if message.type === 'character'}
				<MessageCharacter {message} {game} />
			{/if}
		{/each}

		{#if showActionBar}
			<ActionBar
				options={currentOptions}
				{onContinue}
				{onToggleOptions}
				{onSelectOption}
			/>
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
		padding: 20px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 15px;
		min-height: 0;
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
