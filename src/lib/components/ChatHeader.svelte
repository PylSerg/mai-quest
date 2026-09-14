<script lang="ts">
	import { TIME_ICONS } from "$lib/stores/game.svelte";

	interface Props {
		title: string;
		day: number;
		timeOfDay: string;
		onToggleSidebar: () => void;
	}
	let { title, day, timeOfDay, onToggleSidebar }: Props = $props();
</script>

<div class="chat-header">
	<div class="chat-header-title">
		<button
			class="btn-toggle-sidebar"
			onclick={onToggleSidebar}
			title="Меню">☰</button
		>
	</div>
	<div class="header-actions">
		<span class="header-badge" title="Поточний день">День {day}</span>
		<span class="header-badge" title="Поточний час доби"
			>{TIME_ICONS[timeOfDay] || "☀️"} {timeOfDay}</span
		>
		<button
			class="btn-round"
			onclick={() => location.reload()}
			title="Перезавантажити сторінку">🔄</button
		>
	</div>
</div>

<style>
	.chat-header {
		padding: 12px 20px;
		background: var(--panel-bg);
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 10px;
		flex-shrink: 0;
		height: 60px;
	}
	.chat-header-title {
		display: flex;
		align-items: center;
		gap: 12px;
		min-width: 0;
		flex: 1;
	}
	.header-actions {
		display: flex;
		align-items: center;
		gap: 8px;
	}
	.header-badge {
		font-size: 12px;
		font-weight: 600;
		padding: 4px 10px;
		border-radius: 14px;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		white-space: nowrap;
	}
	.btn-toggle-sidebar {
		padding: 6px 12px;
		font-size: 18px;
		line-height: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
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
		background: var(--input-bg);
	}
</style>
