<script lang="ts">
	import type { Game, Location } from "$lib/types";
	import {
		updateLocationName,
		updateLocationDescription,
		deleteLocation,
		gameState,
	} from "$lib/stores/game.svelte";

	interface Props {
		loc: Location;
		game: Game;
	}
	let { loc, game }: Props = $props();

	const currentLocationName = $derived(
		(game.locationName || game.location || "").trim().toLowerCase(),
	);
	const isCurrent = $derived(
		!!currentLocationName &&
			!!loc.name &&
			loc.name.trim().toLowerCase() === currentLocationName,
	);
	const canDelete = $derived(
		!game.isStarted ||
			gameState.pendingManualLocationIds.includes(loc.id) ||
			!!loc.pendingManualDeletion,
	);
	const titleText = $derived(
		loc.name ||
			(loc.description
				? loc.description.trim().split("\n")[0].slice(0, 30)
				: "Нова локація"),
	);

	function handleDelete(e: MouseEvent) {
		e.stopPropagation();
		e.preventDefault();
		if (!canDelete) {
			alert("Після початку гри цю локацію не можна видалити.");
			return;
		}
		const locName = loc.name || "цю локацію";
		if (!confirm(`Видалити локацію "${locName}"?`)) return;
		deleteLocation(loc.id);
	}
</script>

<details class="char-details">
	<summary>
		<span style="font-size: 15px;">📍</span>
		<span class="loc-title">{titleText}</span>
		{#if isCurrent}
			<span class="current-badge">Поточна</span>
		{/if}
		{#if canDelete}
			<button
				class="danger del-btn"
				onclick={handleDelete}
				title="Видалити локацію">✕</button
			>
		{:else}
			<span
				class="locked-icon"
				title="Після початку гри локація заблокована">🔒</span
			>
		{/if}
	</summary>
	<div class="char-details-body">
		<div class="form-group">
			<label for="loc_{loc.id}_name">Назва локації</label>
			<input
				id="loc_{loc.id}_name"
				type="text"
				value={loc.name || ""}
				placeholder="Назва локації..."
				onchange={(e) =>
					updateLocationName(
						loc.id,
						(e.target as HTMLInputElement).value,
					)}
			/>
		</div>
		<div class="form-group">
			<label for="loc_{loc.id}_desc">Опис локації</label>
			<textarea
				id="loc_{loc.id}_desc"
				rows="5"
				placeholder="Опис локації..."
				onchange={(e) =>
					updateLocationDescription(
						loc.id,
						(e.target as HTMLTextAreaElement).value,
					)}>{loc.description || ""}</textarea
			>
		</div>
	</div>
</details>

<style>
	textarea {
		min-width: 100%;
		max-width: 100%;
	}

	.char-details {
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 8px;
		background: var(--panel-bg);
	}
	.char-details summary {
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;
		list-style: none;
	}
	.char-details summary::-webkit-details-marker {
		display: none;
	}
	.loc-title {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		font-weight: 500;
		white-space: nowrap;
	}
	.current-badge {
		font-size: 11px;
		padding: 2px 7px;
		border-radius: 10px;
		background: var(--accent-color);
		color: white;
		white-space: nowrap;
	}
	.del-btn {
		padding: 1px 6px;
		font-size: 12px;
		margin-left: 4px;
	}
	.locked-icon {
		font-size: 12px;
		opacity: 0.45;
		margin-left: 4px;
		padding: 1px 6px;
	}
	.char-details-body {
		padding-top: 8px;
		margin-top: 8px;
		border-top: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.form-group label {
		font-size: 11px;
		color: var(--text-dim);
		text-transform: uppercase;
		font-weight: bold;
	}
</style>
