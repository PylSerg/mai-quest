<script lang="ts">
	import { isMobileDevice } from '$lib/utils/platform';

	interface Props {
		disabled: boolean;
		isGenerating: boolean;
		statusText: string;
		onSend: (text: string) => void;
	}
	let { disabled, isGenerating, statusText, onSend }: Props = $props();

	let text = $state('');
	let textareaEl: HTMLTextAreaElement | null = $state(null);

	export function setValue(val: string) {
		text = val;
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
			textareaEl.focus();
		}
	}

	function autoResize() {
		if (!textareaEl) return;
		textareaEl.style.height = 'auto';
		textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			if (isMobileDevice()) return;
			if (!e.shiftKey) {
				e.preventDefault();
				send();
			}
		}
	}

	function send() {
		const t = text.trim();
		if (!t || disabled || isGenerating) return;
		onSend(t);
		text = '';
		if (textareaEl) {
			textareaEl.style.height = 'auto';
		}
	}
</script>

{#if isGenerating}
	<div class="status-container">
		<div class="pulse-loader">
			<span></span><span></span><span></span>
		</div>
		<span>{statusText}</span>
	</div>
{/if}

<div class="chat-input-area">
	<div class="input-controls">
		<textarea
			bind:this={textareaEl}
			bind:value={text}
			rows="1"
			style="flex:1; resize:none; overflow-y:auto; font-size:18px;"
			placeholder="Що ти робиш або кажеш?..."
			disabled={disabled || isGenerating}
			oninput={autoResize}
			onkeydown={handleKeydown}
		></textarea>
		<button
			class="btn-send"
			onclick={send}
			title="Надіслати"
			disabled={disabled || isGenerating}
		>
			<svg viewBox="0 0 24 24" width="20" height="20" fill="white">
				<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
			</svg>
		</button>
	</div>
</div>

<style>
	.status-container {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
		padding: 8px;
		background: var(--panel-bg);
		border-top: 1px solid var(--border-color);
		font-size: 13px;
		color: var(--accent-color);
		font-weight: 500;
	}
	.pulse-loader {
		display: flex;
		gap: 6px;
	}
	.pulse-loader span {
		width: 8px;
		height: 8px;
		background: var(--accent-color);
		border-radius: 50%;
		animation: pulse 1.2s infinite ease-in-out;
	}
	.pulse-loader span:nth-child(2) { animation-delay: 0.2s; }
	.pulse-loader span:nth-child(3) { animation-delay: 0.4s; }
	@keyframes pulse {
		0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
		40% { transform: scale(1.2); opacity: 1; }
	}
	.chat-input-area {
		padding: 12px 15px;
		background: var(--panel-bg);
		border-top: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 10px;
		flex-shrink: 0;
	}
	.input-controls {
		display: flex;
		gap: 10px;
	}
	.btn-send {
		width: 44px !important;
		height: 44px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		flex-shrink: 0;
		align-self: flex-end;
	}
	.btn-send svg { margin-left: 3px; }
	.btn-send:disabled { opacity: 0.5; cursor: not-allowed; }
	textarea:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
