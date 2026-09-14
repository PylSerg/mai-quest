export function isMobileDevice(): boolean {
	const ua = navigator.userAgent || navigator.vendor || '';
	const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
	const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
	const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
	return isMobileUA || isCoarse || (hasTouch && window.matchMedia('(max-width: 900px)').matches);
}
