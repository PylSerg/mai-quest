<script lang="ts">
	import {
		gameState,
		createNewGame,
		loadGameById,
		deleteCurrentGame,
		exportCurrentGame,
		importGame,
		SCENARIOS_PRESETS,
	} from "$lib/stores/game.svelte";
	import {
		uiState,
		toggleTheme,
		toggleSidebarHeader,
	} from "$lib/stores/ui.svelte";

	let fileInputRef: HTMLInputElement | null = $state(null);

	async function handleCreateNewGame() {
		const defaultPreset = SCENARIOS_PRESETS[0];
		const title = prompt(
			"Введіть назву нової пригоди:",
			defaultPreset.title,
		);
		const effectiveTitle = title?.trim() || defaultPreset.title;
		await createNewGame(
			effectiveTitle,
			uiState.apiKey,
			uiState.selectedModel,
		);
	}

	async function handleDeleteCurrentGame() {
		if (!gameState.currentGame) return;
		if (confirm(`Видалити гру "${gameState.currentGame.title}"?`)) {
			await deleteCurrentGame();
		}
	}

	function handleImportFile(e: Event) {
		const target = e.target as HTMLInputElement;
		const file = target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = async (ev) => {
			try {
				const content = ev.target?.result as string;
				await importGame(content);
			} catch (err) {
				alert("Помилка читання JSON файлу");
				console.error(err);
			}
			target.value = "";
		};
		reader.readAsText(file);
	}

	async function handleSelectGame(e: Event) {
		const select = e.target as HTMLSelectElement;
		const id = parseInt(select.value);
		if (id) {
			await loadGameById(id);
		}
	}
</script>

<div class="sidebar-header">
	<div class="row header-title-row">
		<strong>My AI Quest</strong>
		<div class="row" style="gap: 6px;">
			<button
				class="btn-round"
				onclick={toggleTheme}
				title="Переключити тему"
			>
				{uiState.theme === "light" ? "🌙" : "☀️"}
			</button>
			<button
				class="btn-round"
				onclick={toggleSidebarHeader}
				title="Згорнути/розгорнути панель"
			>
				{uiState.sidebarHeaderCollapsed ? "▼" : "▲"}
			</button>
		</div>
	</div>

	<div
		class="sidebar-header-body"
		class:collapsed={uiState.sidebarHeaderCollapsed}
	>
		<div class="form-group">
			<label for="apiKeyInput">Gemini API Key</label>
			<input
				id="apiKeyInput"
				type="password"
				placeholder="Введи свій API Key..."
				bind:value={uiState.apiKey}
			/>
		</div>

		<div class="form-group">
			<label for="modelSelect">Модель Gemini</label>
			<select id="modelSelect" bind:value={uiState.selectedModel}>
				<option value="gemini-3.5-flash-lite"
					>Gemini 3.5 Flash-Lite</option
				>
				<option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
				<option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
				<option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
				<option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
			</select>
		</div>

		<div class="row game-control">
			<label for="gameSelect">Поточна гра</label>
			<select
				id="gameSelect"
				value={gameState.currentGame?.id ?? ""}
				onchange={handleSelectGame}
				style="flex: 1; min-width: 0; max-width: 100%; width: 100%;"
			>
				{#if gameState.games.length === 0}
					<option value="">Немає збережених ігор</option>
				{:else}
					{#each gameState.games as game (game.id)}
						<option value={game.id}>{game.title}</option>
					{/each}
				{/if}
			</select>

			<div class="game-buttons">
				<button onclick={handleCreateNewGame} title="Створити гру"
					>+</button
				>
				<button onclick={exportCurrentGame} title="Експорт у JSON"
					>💾</button
				>
				<button
					onclick={() => fileInputRef?.click()}
					title="Імпорт з JSON">📥</button
				>
				<input
					type="file"
					bind:this={fileInputRef}
					accept=".json"
					style="display:none"
					onchange={handleImportFile}
				/>
				<button
					class="danger"
					onclick={handleDeleteCurrentGame}
					title="Видалити гру">🗑</button
				>
			</div>
		</div>
	</div>
</div>

<style>
	.sidebar-header {
		padding: 15px;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex-shrink: 0;
	}
	.header-title-row {
		justify-content: space-between;
	}
	.sidebar-header-body {
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow: hidden;
		max-height: 500px;
		opacity: 1;
		transition:
			max-height 0.3s ease,
			opacity 0.25s ease,
			margin-top 0.3s ease;
	}
	.sidebar-header-body.collapsed {
		max-height: 0;
		opacity: 0;
		margin-top: -10px;
		pointer-events: none;
	}
	.row {
		display: flex;
		gap: 8px;
		align-items: center;
	}

	.game-control {
		display: flex;
		flex-direction: column;
		margin-top: 20px;
	}

	.game-control label {
		width: 100%;
	}
	.game-buttons {
		display: flex;
		flex-direction: row;
		justify-content: space-between;
		gap: 20px;
		width: 100%;
		margin-top: 10px;
	}
	.game-buttons button {
		width: 100%;
	}
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 5px;
	}
	.form-group label,
	.game-control label {
		font-size: 11px;
		color: var(--text-dim);
		text-transform: uppercase;
		font-weight: bold;
		text-align: left;
	}
	.btn-round {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 18px;
		padding: 0;
		cursor: pointer;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-color);
		font-weight: normal;
	}
	.btn-round:hover {
		border-color: var(--accent-color);
	}
</style>
