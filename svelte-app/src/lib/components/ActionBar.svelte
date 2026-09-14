<script lang="ts">
	interface Props {
		options: string[];
		onContinue: () => void;
		onToggleOptions: () => void;
		onSelectOption: (opt: string) => void;
	}
	let { options, onContinue, onToggleOptions, onSelectOption }: Props = $props();
</script>

<div class="ai-action-bar">
	<button class="ai-action-btn" onclick={onContinue}>⏩ Продовжити</button>
	<button class="ai-action-btn" onclick={onToggleOptions}>💡 Варіанти</button>
</div>

{#if options.length > 0}
	<div class="options-list">
		{#each options as opt}
			<button class="option-pill" onclick={() => onSelectOption(opt)}>{opt}</button>
		{/each}
	</div>
{/if}

<style>
	.ai-action-bar {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 5px;
	}
	.ai-action-btn {
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		color: var(--text-color);
		font-weight: normal;
		font-size: 13px;
		padding: 6px 12px;
		border-radius: 16px;
		cursor: pointer;
		transition: background 0.2s;
	}
	.ai-action-btn:hover {
		border-color: var(--accent-color);
		background: var(--panel-bg);
	}
	.options-list {
		display: flex;
		flex-direction: column;
		gap: 6px;
		width: 100%;
		margin-top: 8px;
	}
	.option-pill {
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 18px;
		font-style: italic;
		cursor: pointer;
		text-align: left;
		hyphens: auto;
		white-space: pre-wrap;
		color: var(--text-color);
		transition: all 0.2s;
		font-weight: normal;
	}
	.option-pill:hover {
		border-color: var(--accent-color);
		transform: translateX(3px);
		background: var(--panel-bg);
	}
</style>
