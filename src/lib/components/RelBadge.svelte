<script lang="ts">
	import { getRelClass, getRelIcon, getRelDescription } from '$lib/utils/relations';

	interface Props {
		rel: number;
	}
	let { rel }: Props = $props();
</script>

<span
	class="rel-badge {getRelClass(rel)}"
	title="Відношення до вас: {rel}% ({getRelDescription(rel)})"
>
	{getRelIcon(rel)} {rel}%
</span>

<style>
	.rel-badge {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: 12px;
		font-weight: 600;
		padding: 2px 7px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.08);
		border: 1px solid rgba(255, 255, 255, 0.12);
		line-height: 1.2;
		vertical-align: middle;
		user-select: none;
	}
	:global(.rel-badge.rel-love) { color: #ff6b9d; border-color: rgba(255,107,157,0.35); background: rgba(255,107,157,0.12); }
	:global(.rel-badge.rel-friend) { color: #4ade80; border-color: rgba(74,222,128,0.35); background: rgba(74,222,128,0.12); }
	:global(.rel-badge.rel-friendly) { color: #2dd4bf; border-color: rgba(45,212,191,0.35); background: rgba(45,212,191,0.12); }
	:global(.rel-badge.rel-neutral) { color: #94a3b8; border-color: rgba(148,163,184,0.35); background: rgba(148,163,184,0.12); }
	:global(.rel-badge.rel-suspicious) { color: #fbbf24; border-color: rgba(251,191,36,0.35); background: rgba(251,191,36,0.12); }
	:global(.rel-badge.rel-hostile) { color: #f87171; border-color: rgba(248,113,113,0.35); background: rgba(248,113,113,0.12); }
	:global(.rel-badge.rel-hate) { color: #ef4444; border-color: rgba(239,68,68,0.5); background: rgba(239,68,68,0.2); font-weight: bold; }
</style>
