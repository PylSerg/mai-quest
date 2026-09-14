// UI state store using Svelte 5 runes

let _theme = $state<'dark' | 'light'>('dark');
let _sidebarOpen = $state(false); // For mobile overlay
let _sidebarCollapsed = $state(false); // For desktop toggle
let _sidebarHeaderCollapsed = $state(false);
let _apiKey = $state('');
let _selectedModel = $state('gemini-3.5-flash-lite');

export const uiState = {
	get theme() {
		return _theme;
	},
	set theme(v: 'dark' | 'light') {
		_theme = v;
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', v);
			localStorage.setItem('app_theme', v);
		}
	},

	get sidebarOpen() {
		return _sidebarOpen;
	},
	set sidebarOpen(v: boolean) {
		_sidebarOpen = v;
	},

	get sidebarCollapsed() {
		return _sidebarCollapsed;
	},
	set sidebarCollapsed(v: boolean) {
		_sidebarCollapsed = v;
	},

	get sidebarHeaderCollapsed() {
		return _sidebarHeaderCollapsed;
	},
	set sidebarHeaderCollapsed(v: boolean) {
		_sidebarHeaderCollapsed = v;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('sidebar_header_collapsed', v ? '1' : '0');
		}
	},

	get apiKey() {
		return _apiKey;
	},
	set apiKey(v: string) {
		_apiKey = v;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('gemini_api_key', v);
		}
	},

	get selectedModel() {
		return _selectedModel;
	},
	set selectedModel(v: string) {
		_selectedModel = v;
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('gemini_selected_model', v);
		}
	}
};

export function initUI(): void {
	if (typeof window === 'undefined') return;

	// Init theme
	const savedTheme = localStorage.getItem('app_theme') as 'dark' | 'light' | null;
	if (savedTheme === 'dark' || savedTheme === 'light') {
		_theme = savedTheme;
	} else {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		_theme = prefersDark ? 'dark' : 'light';
	}
	document.documentElement.setAttribute('data-theme', _theme);

	// Init sidebar header
	const savedHeader = localStorage.getItem('sidebar_header_collapsed');
	_sidebarHeaderCollapsed = savedHeader === '1';

	// Init apiKey & model
	_apiKey = localStorage.getItem('gemini_api_key') || '';
	_selectedModel = localStorage.getItem('gemini_selected_model') || 'gemini-3.5-flash-lite';
}

export function toggleTheme(): void {
	uiState.theme = _theme === 'light' ? 'dark' : 'light';
}

export function toggleSidebar(): void {
	if (typeof window !== 'undefined' && window.innerWidth <= 768) {
		_sidebarOpen = !_sidebarOpen;
	} else {
		_sidebarCollapsed = !_sidebarCollapsed;
	}
}

export function closeMobileSidebar(): void {
	_sidebarOpen = false;
}

export function toggleSidebarHeader(): void {
	uiState.sidebarHeaderCollapsed = !_sidebarHeaderCollapsed;
}
