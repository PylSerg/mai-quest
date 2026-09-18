<script lang="ts">
	import { gameState } from "$lib/stores/game.svelte";
	import { uiState } from "$lib/stores/ui.svelte";
	import SidebarHeader from "./SidebarHeader.svelte";
	import GameStatePanel from "./GameStatePanel.svelte";
</script>

<div
	id="sidebar"
	class:collapsed={uiState.sidebarCollapsed}
	class:open={uiState.sidebarOpen}
>
	<SidebarHeader />

	{#if gameState.currentGame}
		<GameStatePanel game={gameState.currentGame} />
	{/if}
</div>

<style>
	#sidebar {
		width: 380px;
		height: 100%;
		background: var(--panel-bg);
		border-right: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		transition:
			margin-left 0.3s ease,
			transform 0.3s ease;
		z-index: 100;
		flex-shrink: 0;
	}

	#sidebar.collapsed {
		margin-left: -380px;
	}

	@media (max-width: 768px) {
		#sidebar {
			position: fixed;
			top: 0;
			left: 0;
			height: 100%;
			width: 85%;
			max-width: 340px;
			transform: translateX(-100%);
			margin-left: 0 !important;
		}

		#sidebar.open {
			transform: translateX(0);
		}
	}
</style>
