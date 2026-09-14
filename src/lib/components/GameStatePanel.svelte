<script lang="ts">
	import type { Game } from "$lib/types";
	import {
		updateGameState,
		addNewCharacter,
		addNewLocation,
	} from "$lib/stores/game.svelte";
	import CharacterCard from "./CharacterCard.svelte";
	import LocationCard from "./LocationCard.svelte";

	interface Props {
		game: Game;
	}
	let { game }: Props = $props();

	function handleTimeOfDayChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		updateGameState({ timeOfDay: val });
	}

	function handleLocationNameChange(e: Event) {
		const val = (e.target as HTMLInputElement).value.trim();
		updateGameState({ locationName: val, location: val });
	}

	function handleLocationDescriptionChange(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value.trim();
		updateGameState({ locationDescription: val });
	}

	function handleSettingChange(e: Event) {
		const val = (e.target as HTMLInputElement).value.trim();
		updateGameState({ setting: val });
	}

	function handleObjectivesChange(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		updateGameState({ objectives: val });
	}

	function handleMemoryChange(e: Event) {
		const val = (e.target as HTMLTextAreaElement).value;
		updateGameState({ memory: val });
	}

	function handlePlayerCharChange(e: Event) {
		const val = (e.target as HTMLSelectElement).value;
		updateGameState({ playerCharId: val });
	}
</script>

<div class="sidebar-content">
	<!-- Current Day & Time of Day -->
	<div class="card">
		<div class="card-header">📅 Поточний день та час</div>
		<div class="form-group" style="margin-bottom: 12px;">
			<span class="form-label">Поточний день</span>
			<div class="state-day-display">
				День {game.day || 1}
			</div>
		</div>
		<div class="form-group">
			<label for="stateTimeOfDay">Час доби</label>
			<select
				id="stateTimeOfDay"
				value={game.timeOfDay || "День"}
				onchange={handleTimeOfDayChange}
			>
				<option value="Ранок">🌅 Ранок</option>
				<option value="День">☀️ День</option>
				<option value="Вечір">🌆 Вечір</option>
				<option value="Ніч">🌙 Ніч</option>
			</select>
		</div>
	</div>

	<!-- World Settings -->
	<div class="card">
		<div class="card-header">🌍 Оточення та Світ</div>
		<div class="form-group">
			<label for="stateLocationName">Назва локації</label>
			<input
				id="stateLocationName"
				type="text"
				placeholder="Назва поточної локації"
				value={game.locationName || game.location || ""}
				onchange={handleLocationNameChange}
			/>
		</div>
		<div class="form-group">
			<label for="stateLocationDescription">Опис локації</label>
			<textarea
				id="stateLocationDescription"
				rows="4"
				placeholder="Детальний опис поточної локації"
				value={game.locationDescription || ""}
				onchange={handleLocationDescriptionChange}
			></textarea>
		</div>
		<div class="form-group">
			<label for="stateSetting">Сеттинг / атмосфера</label>
			<input
				id="stateSetting"
				type="text"
				placeholder="наприклад: середньовіччя, кіберпанк, космос"
				value={game.setting || ""}
				onchange={handleSettingChange}
			/>
		</div>
	</div>

	<!-- Objectives -->
	<div class="card">
		<div class="card-header">
			<label for="stateObjectives">🎯 Цілі квесту</label>
		</div>
		<textarea
			id="stateObjectives"
			rows="4"
			value={game.objectives || ""}
			onchange={handleObjectivesChange}
		></textarea>
	</div>

	<!-- Memory Log -->
	<div class="card">
		<div class="card-header">
			<label for="stateMemory">🧠 Пам'ять квесту</label>
		</div>
		<textarea
			id="stateMemory"
			rows="10"
			placeholder="• День 1, Ранок, Запорошена таверна: Основні моменти..."
			value={game.memory || ""}
			onchange={handleMemoryChange}
		></textarea>
	</div>

	<!-- Character Selection -->
	<div class="card">
		<div class="card-header">
			<label for="playerCharSelect">🎭 Ваш гравець</label>
		</div>
		<select
			id="playerCharSelect"
			value={game.playerCharId}
			onchange={handlePlayerCharChange}
			disabled={game.isStarted}
		>
			{#each game.characters as c (c.id)}
				{@const raceStr = c.race ? `${c.race}, ` : ""}
				<option value={c.id}>
					{c.name || ""}
					{c.surname || ""} ({raceStr}{c.gender || ""})
				</option>
			{/each}
		</select>
	</div>

	<!-- Characters Manager -->
	<div class="card">
		<div class="card-header">
			<span>👥 Персонажі</span>
			<button
				class="btn-add"
				onclick={addNewCharacter}
				title="Додати персонажа">+</button
			>
		</div>
		<div class="list-container">
			{#each game.characters as char (char.id)}
				<CharacterCard {char} {game} />
			{/each}
		</div>
	</div>

	<!-- Locations Manager -->
	<div class="card">
		<div class="card-header">
			<span>📍 Локації</span>
			<button
				class="btn-add"
				onclick={addNewLocation}
				title="Додати локацію">+</button
			>
		</div>
		<div class="list-container">
			{#if (game.locations || []).length === 0}
				<div class="empty-text">Немає доданих локацій</div>
			{:else}
				{#each game.locations || [] as loc (loc.id)}
					<LocationCard {loc} {game} />
				{/each}
			{/if}
		</div>
	</div>
</div>

<style>
	.sidebar-content {
		padding: 15px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}
	.card {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 12px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-weight: bold;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.form-group label,
	.form-label {
		font-size: 11px;
		color: var(--text-dim);
		text-transform: uppercase;
		font-weight: bold;
	}
	.state-day-display {
		font-size: 15px;
		font-weight: 700;
		padding: 8px 12px;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		text-align: center;
		color: var(--text-color);
	}
	.btn-add {
		padding: 2px 8px;
		font-size: 14px;
	}
	.list-container {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.empty-text {
		font-size: 13px;
		color: var(--text-dim);
		font-style: italic;
		text-align: center;
		padding: 10px 0;
	}
</style>
