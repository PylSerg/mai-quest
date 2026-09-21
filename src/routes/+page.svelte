<script lang="ts">
	import { onMount, tick } from "svelte";
	import {
		gameState,
		refreshGameList,
		sendMessage,
		triggerContinue,
		triggerOptions,
		handleStartGame,
		editLastUserMessage,
		createNewGame,
		SCENARIOS_PRESETS,
	} from "$lib/stores/game.svelte";
	import {
		uiState,
		initUI,
		toggleSidebar,
		closeMobileSidebar,
	} from "$lib/stores/ui.svelte";
	import Sidebar from "$lib/components/Sidebar.svelte";
	import ChatHeader from "$lib/components/ChatHeader.svelte";
	import ChatMessages from "$lib/components/ChatMessages.svelte";
	import InputArea from "$lib/components/InputArea.svelte";

	let inputAreaComponent: ReturnType<typeof InputArea> | null = $state(null);
	let scrollRef: HTMLDivElement | null = $state(null);

	onMount(async () => {
		initUI();
		await refreshGameList();
	});

	async function handleSendMessage(text: string) {
		await sendMessage(text, uiState.apiKey, uiState.selectedModel);
	}

	async function handleContinue() {
		await triggerContinue(uiState.apiKey, uiState.selectedModel);
	}

	async function handleToggleOptions() {
		await triggerOptions(uiState.apiKey, uiState.selectedModel);
	}

	async function handleSelectOption(opt: string) {
		gameState.currentOptions = [];
		await sendMessage(opt, uiState.apiKey, uiState.selectedModel);
	}

	async function handleStartGameAction() {
		await handleStartGame(uiState.apiKey, uiState.selectedModel);
	}

	async function handleEditMessage(index: number) {
		const oldText = await editLastUserMessage(index);
		if (oldText !== null) {
			inputAreaComponent?.setValue(oldText);
		}
	}

	async function handleQuickNewGame() {
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
</script>

<!-- Mobile sidebar overlay -->
<div
	id="sidebar-overlay"
	class:active={uiState.sidebarOpen}
	onclick={closeMobileSidebar}
	onkeydown={(e) => e.key === "Escape" && closeMobileSidebar()}
	role="button"
	tabindex="0"
	aria-label="Закрити меню"
></div>

<Sidebar />

<main id="main-chat">
	<ChatHeader
		title={gameState.currentGame?.title || "Оберіть або створіть гру"}
		day={gameState.currentGame?.day || 1}
		timeOfDay={gameState.currentGame?.timeOfDay || "День"}
		locationName={gameState.currentGame?.locationName || gameState.currentGame?.location}
		onToggleSidebar={toggleSidebar}
	/>

	{#if gameState.currentGame}
		<ChatMessages
			game={gameState.currentGame}
			isGenerating={gameState.isGenerating}
			currentOptions={gameState.currentOptions}
			onEditMessage={handleEditMessage}
			onStartGame={handleStartGameAction}
			onContinue={handleContinue}
			onToggleOptions={handleToggleOptions}
			onSelectOption={handleSelectOption}
			bind:scrollRef
		/>

		<InputArea
			bind:this={inputAreaComponent}
			disabled={!gameState.currentGame.isStarted}
			isGenerating={gameState.isGenerating}
			statusText={gameState.statusText}
			onSend={handleSendMessage}
		/>
	{:else}
		<div class="empty-state">
			<div class="empty-card">
				<h2>✨ My AI Quest</h2>
				<p>
					Інтерактивна рольова гра на базі штучного інтелекту Gemini.
				</p>
				<p>
					Створіть свій власний світ з унікальними персонажами,
					локаціями та нелінійним сюжетом.
				</p>
				<button class="btn-create-game" onclick={handleQuickNewGame}>
					+ Створити нову гру
				</button>
			</div>
		</div>
	{/if}
</main>

<style>
	#sidebar-overlay {
		display: none;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(2px);
		z-index: 90;
	}

	@media (max-width: 768px) {
		#sidebar-overlay.active {
			display: block;
		}
	}

	#main-chat {
		flex: 1;
		height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--bg-color);
		min-width: 0;
		position: relative;
	}

	.empty-state {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.empty-card {
		background: var(--card-bg);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 30px;
		max-width: 480px;
		text-align: center;
		display: flex;
		flex-direction: column;
		gap: 15px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
	}

	.empty-card h2 {
		color: var(--accent-color);
		font-size: 24px;
		margin: 0;
	}

	.empty-card p {
		color: var(--text-dim);
		line-height: 1.6;
		margin: 0;
		font-size: 15px;
	}

	.btn-create-game {
		margin-top: 10px;
		padding: 12px 20px;
		font-size: 16px;
		border-radius: 8px;
		align-self: center;
	}
</style>
