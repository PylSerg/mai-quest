<script lang="ts">
	import type { Message } from '$lib/types';

	interface Props {
		message: Message;
	}
	let { message }: Props = $props();
</script>

<div class="message narration">
	<div>{message.text}</div>
</div>

<style>
	.message.narration {
		background: var(--ai-msg-bg);
		border-left: 3px solid var(--accent-color);
		align-self: flex-start;
		width: 100%;
		font-style: normal;
		font-size: 18px;
		color: var(--text-color);
		text-align: left;
		hyphens: auto;
		overflow-wrap: break-word;
		word-spacing: normal;
		white-space: pre-wrap;
	}
</style>
