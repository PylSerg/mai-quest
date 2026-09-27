// Notifications and error reporting store using Svelte 5 runes

export interface AppNotification {
	id: string;
	type: 'error' | 'warning' | 'info' | 'success';
	title: string;
	message: string;
	status?: number;
	statusText?: string;
	details?: string;
	timestamp: number;
	retry?: () => void | Promise<void>;
	isRetrying?: boolean;
	autoDismissMs?: number;
	is503?: boolean;
}

export interface ParsedError {
	title: string;
	message: string;
	status?: number;
	statusText?: string;
	details?: string;
	is503: boolean;
	is429: boolean;
	isAuth: boolean;
	isNetwork: boolean;
}

let _notifications = $state<AppNotification[]>([]);
let _chatError = $state<AppNotification | null>(null);

let idCounter = 0;

export function parseError(err: unknown, defaultTitle = 'Помилка'): ParsedError {
	let message = 'Сталася невідома помилка.';
	let details = '';
	let status: number | undefined = undefined;
	let statusText = '';

	if (typeof err === 'object' && err !== null) {
		const anyErr = err as Record<string, unknown>;
		if (typeof anyErr.status === 'number') {
			status = anyErr.status;
		}
		if (typeof anyErr.statusText === 'string') {
			statusText = anyErr.statusText;
		}
		if (typeof anyErr.details === 'string') {
			details = anyErr.details;
		}
		if (typeof anyErr.message === 'string') {
			message = anyErr.message;
		}
	} else if (typeof err === 'string') {
		message = err;
	}

	// Detect status in message if not explicitly set
	if (!status) {
		const matchStatus = message.match(/\b(503|429|400|401|403|404|500|502|504)\b/);
		if (matchStatus) {
			status = parseInt(matchStatus[1], 10);
		}
	}

	// Detect network error
	const isNetwork =
		status === 0 ||
		message.toLowerCase().includes('failed to fetch') ||
		message.toLowerCase().includes('networkerror') ||
		message.toLowerCase().includes('load failed');

	const is503 =
		status === 503 ||
		message.includes('503') ||
		message.toLowerCase().includes('overloaded') ||
		message.toLowerCase().includes('unavailable');

	const is429 =
		status === 429 ||
		message.includes('429') ||
		message.toLowerCase().includes('quota') ||
		message.toLowerCase().includes('too many requests') ||
		message.toLowerCase().includes('resource_exhausted');

	const isAuth =
		status === 400 ||
		status === 401 ||
		status === 403 ||
		message.toLowerCase().includes('api key') ||
		message.toLowerCase().includes('permission_denied') ||
		message.toLowerCase().includes('invalid_argument');

	let title = defaultTitle;

	if (is503) {
		title = '⚠️ Сервер Gemini перевантажений (503)';
		if (!details && message) details = message;
		message =
			'Модель Gemini тимчасово перевантажена або недоступна (503 Service Unavailable). Зачекайте декілька секунд і спробуйте знову.';
	} else if (is429) {
		title = '⏳ Ліміт запитів вичерпано (429)';
		if (!details && message) details = message;
		message =
			'Перевищено ліміт запитів або вичерпано квоту Gemini API. Зачекайте хвилину або виберіть іншу модель у налаштуваннях.';
	} else if (isAuth) {
		title = `🔑 Помилка API ключа (${status || 400})`;
		if (!details && message) details = message;
		message =
			'Недійсний або відсутній Gemini API Key. Перевірте правильність ключа у бічному меню.';
	} else if (isNetwork) {
		title = '🌐 Помилка з’єднання з мережею';
		if (!details && message) details = message;
		message =
			'Не вдалося зв’язатися з сервером Gemini. Перевірте інтернет-з’єднання чи блокувальники трафіку.';
	} else if (status && status >= 500) {
		title = `💥 Збій сервера Gemini (${status})`;
		if (!details && message) details = message;
		message = `Сервер Google Gemini повернув помилку ${status}. Спробуйте ще раз пізніше.`;
	}

	return {
		title,
		message,
		status,
		statusText,
		details,
		is503,
		is429,
		isAuth,
		isNetwork
	};
}

export interface ReportErrorOptions {
	title?: string;
	retry?: () => void | Promise<void>;
	autoDismissMs?: number;
	showToast?: boolean;
	showInline?: boolean;
}

export function reportError(err: unknown, options: ReportErrorOptions = {}): AppNotification {
	const parsed = parseError(err, options.title);
	const id = `err_${Date.now()}_${++idCounter}`;

	// Default auto-dismiss: 503 stays 20s (or forever if retry is available), others 10s
	let autoDismissMs = options.autoDismissMs;
	if (autoDismissMs === undefined) {
		if (parsed.is503) {
			autoDismissMs = options.retry ? 0 : 25000;
		} else {
			autoDismissMs = options.retry ? 0 : 12000;
		}
	}

	const notification: AppNotification = {
		id,
		type: 'error',
		title: parsed.title,
		message: parsed.message,
		status: parsed.status,
		statusText: parsed.statusText,
		details: parsed.details,
		timestamp: Date.now(),
		retry: options.retry,
		autoDismissMs,
		is503: parsed.is503
	};

	if (options.showToast !== false) {
		// Prevent endless identical toast spam: remove previous toast if title & message match
		_notifications = [
			notification,
			..._notifications.filter(
				(n) => !(n.title === notification.title && n.message === notification.message)
			)
		].slice(0, 5); // keep max 5 toasts
	}

	if (options.showInline !== false) {
		_chatError = notification;
	}

	return notification;
}

export function reportSuccess(title: string, message = '', autoDismissMs = 4000): AppNotification {
	const id = `succ_${Date.now()}_${++idCounter}`;
	const notification: AppNotification = {
		id,
		type: 'success',
		title,
		message,
		timestamp: Date.now(),
		autoDismissMs
	};
	_notifications = [notification, ..._notifications].slice(0, 5);
	return notification;
}

export function reportInfo(title: string, message = '', autoDismissMs = 6000): AppNotification {
	const id = `info_${Date.now()}_${++idCounter}`;
	const notification: AppNotification = {
		id,
		type: 'info',
		title,
		message,
		timestamp: Date.now(),
		autoDismissMs
	};
	_notifications = [notification, ..._notifications].slice(0, 5);
	return notification;
}

export function dismissNotification(id: string): void {
	_notifications = _notifications.filter((n) => n.id !== id);
}

export function clearChatError(): void {
	_chatError = null;
}

export function clearAllNotifications(): void {
	_notifications = [];
}

export const notificationStore = {
	get notifications() {
		return _notifications;
	},
	get chatError() {
		return _chatError;
	}
};
