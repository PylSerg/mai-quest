<script lang="ts">
	import type { Game, Character } from '$lib/types';
	import AvatarWrap from './AvatarWrap.svelte';
	import RelBadge from './RelBadge.svelte';
	import { FALLBACK_AVATAR, buildAvatarUrl } from '$lib/services/avatar';
	import { getRelation, getRelClass, getRelIcon, getRelDescription } from '$lib/utils/relations';
	import {
		updateCharData,
		updateCharRelation,
		deleteCharacter,
		generateAvatar,
		uploadAvatarFile,
		gameState
	} from '$lib/stores/game.svelte';

	interface Props {
		char: Character;
		game: Game;
	}
	let { char, game }: Props = $props();

	const isPlayer = $derived(char.id === game.playerCharId);
	const relVal = $derived(getRelation(char, game.playerCharId));
	const isPendingNew = $derived(gameState.pendingNewCharIds.includes(char.id));
	const canDelete = $derived(
		!game.isStarted || gameState.pendingManualCharIds.includes(char.id) || !!char.pendingManualDeletion
	);
	const allOtherChars = $derived(game.characters.filter((c) => c.id !== char.id));
	const shouldShowRelations = $derived(!(isPlayer && game.isStarted));

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		if (!canDelete) { alert('Після початку гри цього персонажа не можна видалити.'); return; }
		const name = `${char.name || ''} ${char.surname || ''}`.trim();
		if (!confirm(`Видалити персонажа "${name}"?`)) return;
		deleteCharacter(char.id);
	}

	function handleAvatarFile(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) {
			const reader = new FileReader();
			reader.onload = (ev) => uploadAvatarFile(char.id, ev.target!.result as string);
			reader.readAsDataURL(input.files[0]);
		}
	}

	function handleGenerateAvatar() {
		const name = `${char.name || ''} ${char.surname || ''}`.trim() || 'цього персонажа';
		if (!confirm(`Згенерувати новий аватар для "${name}"? Поточний аватар буде замінено.`)) return;
		generateAvatar(char.id);
	}
</script>

<details class="char-details">
	<summary>
		<AvatarWrap src={char.avatar || FALLBACK_AVATAR} size="28px" />
		<span class="char-summary-name">{char.name || ''} {char.surname || ''}</span>
		{#if !isPlayer}
			<RelBadge rel={relVal} />
		{:else}
			<span class="player-label">(Гравець)</span>
		{/if}
		{#if canDelete}
			<button class="danger del-btn" onclick={handleDelete}>✕</button>
		{:else}
			<span class="locked-icon" title="Після початку гри персонаж заблокований">🔒</span>
		{/if}
	</summary>

	<div class="char-details-body">
		<div class="form-group">
			<label for="char_{char.id}_name">Ім'я</label>
			<input id="char_{char.id}_name" type="text" value={char.name || ''} onchange={(e) => updateCharData(char.id, 'name', (e.target as HTMLInputElement).value)} />
		</div>
		<div class="form-group">
			<label for="char_{char.id}_surname">Прізвище</label>
			<input id="char_{char.id}_surname" type="text" value={char.surname || ''} onchange={(e) => updateCharData(char.id, 'surname', (e.target as HTMLInputElement).value)} />
		</div>
		<div class="form-group">
			<label for="char_{char.id}_race">Раса</label>
			<input id="char_{char.id}_race" type="text" value={char.race || 'Людина'} placeholder="Людина, Ельф, Дворф..." onchange={(e) => updateCharData(char.id, 'race', (e.target as HTMLInputElement).value)} />
		</div>
		<div class="form-group">
			<label for="char_{char.id}_gender">Стать</label>
			<select id="char_{char.id}_gender" onchange={(e) => updateCharData(char.id, 'gender', (e.target as HTMLSelectElement).value)}>
				<option value="Чоловіча" selected={char.gender === 'Чоловіча'}>Чоловіча</option>
				<option value="Жіноча" selected={char.gender === 'Жіноча'}>Жіноча</option>
				<option value="Інша" selected={char.gender === 'Інша'}>Інша</option>
			</select>
		</div>
		<div class="form-group">
			<label for="char_{char.id}_age">Вік</label>
			<input id="char_{char.id}_age" type="number" value={char.age || ''} onchange={(e) => updateCharData(char.id, 'age', (e.target as HTMLInputElement).value)} />
		</div>
		<div class="form-group">
			<label for="char_{char.id}_role">Роль / Фах</label>
			<input id="char_{char.id}_role" type="text" value={char.role || ''} onchange={(e) => updateCharData(char.id, 'role', (e.target as HTMLInputElement).value)} />
		</div>

		{#if shouldShowRelations && allOtherChars.length > 0}
			<div class="relations-block">
				<div class="relations-title">❤️ Відношення до персонажів</div>
				{#each allOtherChars as target}
					{@const targetRel = getRelation(char, target.id)}
					{@const isTargetPlayer = target.id === game.playerCharId}
					{@const targetLabel = `${target.name || ''} ${target.surname || ''} ${isTargetPlayer ? '(Гравець)' : ''}`.trim()}
					{@const showSlider = !game.isStarted || (isPendingNew && !isPlayer) || (!isPlayer && gameState.pendingNewCharIds.includes(target.id))}
					<div class="rel-row">
						<div class="rel-row-label">
							<span>До <strong>{targetLabel}</strong>:</span>
							<RelBadge rel={targetRel} />
						</div>
						{#if showSlider}
							<input
								type="range"
								min="0"
								max="100"
								value={targetRel}
								style="margin-top:2px; cursor:pointer;"
								oninput={(e) => updateCharRelation(char.id, target.id, parseInt((e.target as HTMLInputElement).value))}
							/>
						{/if}
					</div>
				{/each}
			</div>
		{/if}

		<div class="form-group">
			<label for="char_{char.id}_personality">Характер (Ключовий для ШІ)</label>
			<textarea id="char_{char.id}_personality" rows="3" placeholder="Опишіть манеру, темперамент, звички, недоліки..." onchange={(e) => updateCharData(char.id, 'personality', (e.target as HTMLTextAreaElement).value)}>{char.personality || ''}</textarea>
		</div>
		<div class="form-group">
			<label for="char_{char.id}_appearance">Зовнішність</label>
			<textarea id="char_{char.id}_appearance" rows="3" placeholder="Зріст, одяг, зброя, особливі прикмети..." onchange={(e) => updateCharData(char.id, 'appearance', (e.target as HTMLTextAreaElement).value)}>{char.appearance || ''}</textarea>
		</div>
		<div class="form-group">
			<label for="char_{char.id}_avatar">Аватар</label>
			<div class="row">
				<input
					id="char_{char.id}_avatar"
					style="width:100%"
					type="text"
					value={char.avatar && !char.avatar.startsWith('data:') ? char.avatar : ''}
					onchange={(e) => updateCharData(char.id, 'avatar', (e.target as HTMLInputElement).value)}
				/>
				<input type="file" accept="image/*" style="display:none" id="file_{char.id}" onchange={handleAvatarFile} />
				<button type="button" style="padding:4px 8px;font-size:12px;" onclick={() => (document.getElementById(`file_${char.id}`) as HTMLInputElement)?.click()} title="Завантажити файл">📁</button>
				<button type="button" style="padding:4px 8px;font-size:12px;" onclick={handleGenerateAvatar} title="Згенерувати аватар">🎨</button>
			</div>
		</div>
	</div>
</details>

<style>
	.char-details {
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 8px;
		background: var(--panel-bg);
	}
	.char-details summary {
		cursor: pointer;
		font-weight: bold;
		display: flex;
		align-items: center;
		gap: 10px;
		list-style: none;
	}
	.char-details summary::-webkit-details-marker { display: none; }
	.char-summary-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.player-label {
		font-size: 11px;
		opacity: 0.7;
		margin-left: auto;
		margin-right: 6px;
	}
	.del-btn {
		padding: 1px 6px;
		font-size: 12px;
	}
	.locked-icon {
		font-size: 12px;
		opacity: 0.45;
		padding: 1px 6px;
	}
	.char-details-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		margin-top: 10px;
		padding-top: 10px;
		border-top: 1px solid var(--border-color);
	}
	.relations-block {
		padding: 10px;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		background: var(--input-bg);
		margin-top: 6px;
	}
	.relations-title {
		font-weight: bold;
		font-size: 12px;
		margin-bottom: 8px;
		color: var(--accent-color);
	}
	.rel-row {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding-bottom: 6px;
		border-bottom: 1px solid rgba(255,255,255,0.05);
	}
	.rel-row-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 12px;
	}
	.row {
		display: flex;
		gap: 8px;
		align-items: center;
	}
</style>
