<script lang="ts">
	import { onMount } from 'svelte';

	interface Props {
		src: string;
		onConfirm: (croppedDataUrl: string) => void;
		onCancel: () => void;
	}
	let { src, onConfirm, onCancel }: Props = $props();

	let canvas: HTMLCanvasElement;
	let img: HTMLImageElement;
	let containerEl: HTMLDivElement;

	// Display state
	let displayW = $state(0);
	let displayH = $state(0);
	let naturalW = $state(0);
	let naturalH = $state(0);

	// Crop box state (in display coordinates)
	let cropX = $state(0);
	let cropY = $state(0);
	let cropSize = $state(200);

	let isDragging = $state(false);
	let isResizing = $state(false);
	let resizeCorner = $state('');
	let dragStartX = 0;
	let dragStartY = 0;
	let dragStartCropX = 0;
	let dragStartCropY = 0;
	let dragStartCropSize = 0;

	const MIN_CROP = 40;
	const maskId = `crop-mask-${Math.random().toString(36).slice(2)}`;

	onMount(() => {
		const image = new Image();
		image.onload = () => {
			naturalW = image.naturalWidth;
			naturalH = image.naturalHeight;
			const rect = containerEl?.getBoundingClientRect();
			const maxW = rect?.width || 480;
			const maxH = window.innerHeight * 0.55;
			const scale = Math.min(maxW / naturalW, maxH / naturalH, 1);
			displayW = Math.round(naturalW * scale);
			displayH = Math.round(naturalH * scale);
			const minDim = Math.min(displayW, displayH);
			cropSize = Math.round(minDim * 0.7);
			cropX = Math.round((displayW - cropSize) / 2);
			cropY = Math.round((displayH - cropSize) / 2);
		};
		image.onerror = () => {
			displayW = 0;
		};
		image.src = src;
		img = image;

		function onWinMove(e: MouseEvent) {
			if (!isDragging && !isResizing) return;
			onMouseMove(e);
		}
		function onWinUp() {
			onMouseUp();
		}
		window.addEventListener('mousemove', onWinMove);
		window.addEventListener('mouseup', onWinUp);
		return () => {
			window.removeEventListener('mousemove', onWinMove);
			window.removeEventListener('mouseup', onWinUp);
		};
	});

	function clampCrop() {
		if (cropX < 0) cropX = 0;
		if (cropY < 0) cropY = 0;
		if (cropX + cropSize > displayW) cropX = displayW - cropSize;
		if (cropY + cropSize > displayH) cropY = displayH - cropSize;
		if (cropSize < MIN_CROP) cropSize = MIN_CROP;
	}

	function onMouseDown(e: MouseEvent) {
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const mx = e.clientX - rect.left;
		const my = e.clientY - rect.top;
		const corner = getCorner(mx, my);
		if (corner) {
			isResizing = true;
			resizeCorner = corner;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragStartCropX = cropX;
			dragStartCropY = cropY;
			dragStartCropSize = cropSize;
			e.preventDefault();
		} else if (mx >= cropX && mx <= cropX + cropSize && my >= cropY && my <= cropY + cropSize) {
			isDragging = true;
			dragStartX = e.clientX;
			dragStartY = e.clientY;
			dragStartCropX = cropX;
			dragStartCropY = cropY;
			e.preventDefault();
		}
	}

	function onTouchStart(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const mx = e.touches[0].clientX - rect.left;
		const my = e.touches[0].clientY - rect.top;
		const corner = getCorner(mx, my);
		if (corner) {
			isResizing = true;
			resizeCorner = corner;
			dragStartX = e.touches[0].clientX;
			dragStartY = e.touches[0].clientY;
			dragStartCropX = cropX;
			dragStartCropY = cropY;
			dragStartCropSize = cropSize;
			e.preventDefault();
		} else if (mx >= cropX && mx <= cropX + cropSize && my >= cropY && my <= cropY + cropSize) {
			isDragging = true;
			dragStartX = e.touches[0].clientX;
			dragStartY = e.touches[0].clientY;
			dragStartCropX = cropX;
			dragStartCropY = cropY;
			e.preventDefault();
		}
	}

	const CORNER_SIZE = 16;
	function getCorner(mx: number, my: number): string {
		const corners: Record<string, [number, number]> = {
			'tl': [cropX, cropY],
			'tr': [cropX + cropSize, cropY],
			'bl': [cropX, cropY + cropSize],
			'br': [cropX + cropSize, cropY + cropSize],
		};
		for (const [name, [cx, cy]] of Object.entries(corners)) {
			if (Math.abs(mx - cx) <= CORNER_SIZE && Math.abs(my - cy) <= CORNER_SIZE) return name;
		}
		return '';
	}

	function onMouseMove(e: MouseEvent) {
		const dx = e.clientX - dragStartX;
		const dy = e.clientY - dragStartY;
		if (isDragging) {
			cropX = dragStartCropX + dx;
			cropY = dragStartCropY + dy;
			clampCrop();
		} else if (isResizing) {
			handleResize(dx, dy);
		}
	}

	function onTouchMove(e: TouchEvent) {
		if (e.touches.length !== 1) return;
		const dx = e.touches[0].clientX - dragStartX;
		const dy = e.touches[0].clientY - dragStartY;
		if (isDragging) {
			cropX = dragStartCropX + dx;
			cropY = dragStartCropY + dy;
			clampCrop();
			e.preventDefault();
		} else if (isResizing) {
			handleResize(dx, dy);
			e.preventDefault();
		}
	}

	function handleResize(dx: number, dy: number) {
		// Use the average of dx/dy to keep it square, pick dominant axis
		const delta = (Math.abs(dx) > Math.abs(dy) ? dx : dy);
		switch (resizeCorner) {
			case 'tl': {
				const newSize = Math.max(MIN_CROP, dragStartCropSize - delta);
				const diff = dragStartCropSize - newSize;
				cropSize = newSize;
				cropX = dragStartCropX + diff;
				cropY = dragStartCropY + diff;
				break;
			}
			case 'tr': {
				const newSize = Math.max(MIN_CROP, dragStartCropSize + dx);
				cropSize = newSize;
				cropX = dragStartCropX;
				cropY = dragStartCropY - (newSize - dragStartCropSize);
				break;
			}
			case 'bl': {
				const newSize = Math.max(MIN_CROP, dragStartCropSize - dx);
				const diff = dragStartCropSize - newSize;
				cropSize = newSize;
				cropX = dragStartCropX + diff;
				cropY = dragStartCropY;
				break;
			}
			case 'br': {
				const newSize = Math.max(MIN_CROP, dragStartCropSize + delta);
				cropSize = newSize;
				cropX = dragStartCropX;
				cropY = dragStartCropY;
				break;
			}
		}
		clampCrop();
	}

	function onMouseUp() {
		isDragging = false;
		isResizing = false;
		resizeCorner = '';
	}

	function handleConfirm() {
		// Scale from display to natural
		const scaleX = naturalW / displayW;
		const scaleY = naturalH / displayH;
		const sx = Math.round(cropX * scaleX);
		const sy = Math.round(cropY * scaleY);
		const ss = Math.round(cropSize * Math.min(scaleX, scaleY));
		const outputSize = 512;
		const c = canvas;
		c.width = outputSize;
		c.height = outputSize;
		const ctx = c.getContext('2d')!;
		ctx.drawImage(img, sx, sy, ss, ss, 0, 0, outputSize, outputSize);
		const dataUrl = c.toDataURL('image/jpeg', 0.92);
		onConfirm(dataUrl);
	}

	function onBackdropKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onCancel();
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="crop-backdrop"
	role="dialog"
	aria-modal="true"
	aria-label="Редактор аватара"
	onkeydown={onBackdropKeydown}
	tabindex="-1"
>
	<div class="crop-modal">
		<div class="crop-modal-header">
			<span class="crop-title">✂️ Обрізання аватара</span>
			<button class="crop-close" onclick={onCancel} title="Скасувати">✕</button>
		</div>
		<p class="crop-hint">Перетягніть квадрат або кути для вибору частини зображення</p>

		<div class="crop-image-wrap" bind:this={containerEl}>
			{#if displayW > 0}
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<div
					class="crop-canvas-wrap"
					style="width:{displayW}px;height:{displayH}px;"
					onmousedown={onMouseDown}
					ontouchstart={onTouchStart}
					ontouchmove={onTouchMove}
					ontouchend={onMouseUp}
					role="img"
					aria-label="Зображення для обрізання"
				>
					<img src={src} alt="crop source" width={displayW} height={displayH} draggable="false" />

					<!-- Dark overlay -->
					<svg class="crop-overlay" width={displayW} height={displayH}>
						<defs>
							<mask id={maskId}>
								<rect width={displayW} height={displayH} fill="white" />
								<rect x={cropX} y={cropY} width={cropSize} height={cropSize} fill="black" />
							</mask>
						</defs>
						<rect width={displayW} height={displayH} fill="rgba(0,0,0,0.55)" mask="url(#{maskId})" />
					</svg>

					<!-- Crop box border -->
					<div
						class="crop-box"
						class:dragging={isDragging}
						style="left:{cropX}px;top:{cropY}px;width:{cropSize}px;height:{cropSize}px;"
					>
						<!-- Grid lines -->
						<div class="crop-grid">
							<div class="crop-grid-line v" style="left:33.33%"></div>
							<div class="crop-grid-line v" style="left:66.66%"></div>
							<div class="crop-grid-line h" style="top:33.33%"></div>
							<div class="crop-grid-line h" style="top:66.66%"></div>
						</div>
						<!-- Corners -->
						<div class="crop-corner tl"></div>
						<div class="crop-corner tr"></div>
						<div class="crop-corner bl"></div>
						<div class="crop-corner br"></div>
					</div>
				</div>
			{:else}
				<div class="crop-loading">Завантаження...</div>
			{/if}
		</div>

		<div class="crop-actions">
			<button class="btn-cancel" onclick={onCancel}>Скасувати</button>
			<button class="btn-confirm" onclick={handleConfirm} disabled={displayW === 0}>
				✓ Обрізати та зберегти
			</button>
		</div>

		<canvas bind:this={canvas} style="display:none"></canvas>
	</div>
</div>

<style>
	.crop-backdrop {
		position: fixed;
		inset: 0;
		z-index: 1000;
		background: rgba(0, 0, 0, 0.75);
		backdrop-filter: blur(6px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 16px;
		animation: fadeIn 0.18s ease;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.crop-modal {
		background: var(--panel-bg, #1a1a2e);
		border: 1px solid var(--border-color, #333);
		border-radius: 14px;
		padding: 20px;
		display: flex;
		flex-direction: column;
		gap: 14px;
		max-width: 560px;
		width: 100%;
		box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
		animation: slideUp 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
	}
	@keyframes slideUp {
		from { transform: translateY(20px) scale(0.97); opacity: 0; }
		to { transform: none; opacity: 1; }
	}
	.crop-modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.crop-title {
		font-size: 16px;
		font-weight: 700;
		color: var(--text-color, #fff);
	}
	.crop-close {
		background: none;
		border: none;
		color: var(--text-dim, #888);
		font-size: 18px;
		cursor: pointer;
		padding: 4px 8px;
		border-radius: 6px;
		transition: color 0.15s, background 0.15s;
		font-weight: normal;
	}
	.crop-close:hover {
		color: var(--text-color, #fff);
		background: rgba(255,255,255,0.08);
	}
	.crop-hint {
		font-size: 12px;
		color: var(--text-dim, #888);
		margin: 0;
		text-align: center;
	}
	.crop-image-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 80px;
		overflow: hidden;
	}
	.crop-canvas-wrap {
		position: relative;
		user-select: none;
		cursor: default;
		flex-shrink: 0;
		border-radius: 6px;
		overflow: hidden;
	}
	.crop-canvas-wrap img {
		display: block;
		pointer-events: none;
		border-radius: 6px;
	}
	.crop-overlay {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.crop-box {
		position: absolute;
		border: 2px solid var(--accent-color, #7c6cfc);
		box-sizing: border-box;
		cursor: move;
		border-radius: 2px;
	}
	.crop-box.dragging {
		cursor: grabbing;
	}
	.crop-grid {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}
	.crop-grid-line {
		position: absolute;
		background: rgba(255, 255, 255, 0.25);
	}
	.crop-grid-line.v {
		top: 0; bottom: 0; width: 1px;
	}
	.crop-grid-line.h {
		left: 0; right: 0; height: 1px;
	}
	.crop-corner {
		position: absolute;
		width: 14px;
		height: 14px;
		background: var(--accent-color, #7c6cfc);
		border-radius: 2px;
		cursor: nwse-resize;
	}
	.crop-corner.tl { top: -5px; left: -5px; cursor: nwse-resize; }
	.crop-corner.tr { top: -5px; right: -5px; cursor: nesw-resize; }
	.crop-corner.bl { bottom: -5px; left: -5px; cursor: nesw-resize; }
	.crop-corner.br { bottom: -5px; right: -5px; cursor: nwse-resize; }

	.crop-loading {
		color: var(--text-dim, #888);
		font-size: 14px;
		padding: 40px;
	}
	.crop-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
	}
	.btn-cancel {
		padding: 8px 18px;
		background: transparent;
		border: 1px solid var(--border-color, #444);
		color: var(--text-dim, #aaa);
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		transition: all 0.15s;
	}
	.btn-cancel:hover {
		border-color: var(--text-dim, #aaa);
		color: var(--text-color, #fff);
	}
	.btn-confirm {
		padding: 8px 20px;
		background: var(--accent-color, #7c6cfc);
		border: none;
		color: #fff;
		border-radius: 8px;
		cursor: pointer;
		font-size: 14px;
		font-weight: 600;
		transition: all 0.15s;
	}
	.btn-confirm:hover:not(:disabled) {
		filter: brightness(1.15);
	}
	.btn-confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
