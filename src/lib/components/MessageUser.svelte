<script lang="ts">
	import type { Message, Game } from '$lib/types';
	import AvatarWrap from './AvatarWrap.svelte';
	import { FALLBACK_AVATAR } from '$lib/services/avatar';

	interface Props {
		message: Message;
		game: Game;
		isLast: boolean;
		onEdit: () => void;
	}
	let { message, game, isLast, onEdit }: Props = $props();

	const playerChar = $derived(
		game.characters.find((c) => c.id === game.playerCharId) || { name: 'Ти', surname: '', avatar: '' }
	);
</script>

<div class="message user">
	<div class="char-header user-header">
		{#if isLast}
			<button class="btn-edit-msg" onclick={onEdit} title="Редагувати в полі вводу">✏️</button>
		{/if}
		<span class="char-name">{playerChar.name || ''} {playerChar.surname || ''}</span>
		<AvatarWrap src={playerChar.avatar || FALLBACK_AVATAR} />
	</div>
	<div class="char-text">{message.text}</div>
</div>

<style>
	.message.user {
		background: var(--user-msg-bg);
		align-self: flex-end;
		border-bottom-right-radius: 2px;
		border: 1px solid var(--border-color);
	}
	.char-header {
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 8px;
	}
	.user-header { justify-content: flex-end; }
	.char-name {
		font-weight: bold;
		color: var(--text-color);
		font-size: 15px;
	}
	.char-text {
		font-size: 18px;
		text-align: left;
		hyphens: auto;
		overflow-wrap: break-word;
		white-space: pre-wrap;
		word-spacing: 0px;
	}
	.btn-edit-msg {
		background: transparent;
		border: none;
		cursor: pointer;
		font-size: 14px;
		opacity: 0.6;
		padding: 2px 5px;
		color: var(--text-color);
	}
	.btn-edit-msg:hover { opacity: 1; background: transparent; }
</style>
