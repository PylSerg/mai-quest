<script lang="ts">
	import type { Message, Game } from '$lib/types';
	import AvatarWrap from './AvatarWrap.svelte';
	import RelBadge from './RelBadge.svelte';
	import { FALLBACK_AVATAR } from '$lib/services/avatar';
	import { getRelation } from '$lib/utils/relations';

	interface Props {
		message: Message;
		game: Game;
		msgIdx?: number;
	}
	let { message, game, msgIdx }: Props = $props();

	const char = $derived(
		game.characters.find((c) => c.id === message.charId) || {
			name: message.charName || 'Персонаж',
			surname: '',
			avatar: '',
			id: message.charId || 'default'
		}
	);
	const isPlayer = $derived(char.id === game.playerCharId);
	const relToPlayer = $derived(() => {
		const stored = Number(message.relationAtMessage);
		if (Number.isFinite(stored)) return stored;
		const fullChar = game.characters.find((c) => c.id === message.charId);
		return fullChar ? getRelation(fullChar, game.playerCharId) : 50;
	});
</script>

<div class="message character" data-msg-idx={msgIdx}>
	<div class="char-header">
		<AvatarWrap src={(char as { avatar?: string }).avatar || FALLBACK_AVATAR} />
		<span class="char-name">{char.name || ''} {char.surname || ''}</span>
		{#if !isPlayer}
			<RelBadge rel={relToPlayer()} />
		{/if}
	</div>
	<div class="char-text">{message.text}</div>
</div>

<style>
	.message.character {
		background: var(--ai-msg-bg);
		border: 1px solid var(--border-color);
		align-self: flex-start;
	}
	.char-header {
		display: flex;
		align-items: center;
		gap: 10px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		padding-bottom: 8px;
	}
	.char-name {
		font-weight: bold;
		color: var(--accent-color);
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
</style>
