import type { Game, Character, Location } from '../types';
import { dbSaveGame, dbDeleteGame, dbGetAllGames } from '../services/db';
import { buildAvatarUrl } from '../services/avatar';
import {
	callGeminiCreateWorld,
	callGemini,
	callGeminiOptions,
	callGeminiStart,
	TIME_STEPS
} from '../services/gemini';
import { captureWorldStateSnapshot, restoreWorldStateSnapshot, deepClone } from '../utils/snapshot';
import { setRelation } from '../utils/relations';

export const SCENARIOS_PRESETS = [
	{
		title: 'Таємниця закинутої таверни',
		setting: 'medieval fantasy',
		day: 1,
		locationName: 'Запорошена таверна «Чорний Круг»',
		locationDescription:
			"Стара напівзруйнована таверна на краю селища. Усередині пахне сирою деревиною, пилом і згаслим вогнищем; це тимчасовий прихисток під час негоди.",
		location: 'Запорошена таверна «Чорний Круг»',
		timeOfDay: 'Ніч',
		objectives: 'Знайти зашифровану карту до старої шахти',
		memory: '• День 1, Ніч, Запорошена таверна «Чорний Круг»: Ви сховалися у закинутій будівлі під час грози.',
		locations: [
			{
				id: 'loc_preset_1',
				name: 'Запорошена таверна «Чорний Круг»',
				description:
					"Запорошена таверна «Чорний Круг». Стара напівзруйнована будівля на краю селища, де можна знайти тимчасовий прихисток під час негоди."
			}
		],
		pName: 'Сергій',
		pSurname: 'Мандрівник',
		pRace: 'Людина',
		pGender: 'Чоловіча',
		pAge: 29,
		pRole: 'Шукач пригод',
		pPersonality: 'Сміливий, допитливий',
		pApp: 'Темний плащ, шпага на поясі',
		cName: 'Емілі',
		cSurname: 'Золота Лисиця',
		cRace: 'Людина',
		cGender: 'Жіноча',
		cAge: 24,
		cRole: 'Здібна злодійка',
		cPersonality: 'Горда егоїстка, допитлива, кмітлива, імпульсивна та закохана у стародавні таємниці, гостра на язик',
		cApp: 'Шкіряний обладунок, короткий клинок'
	}
];

export const TIME_ICONS: Record<string, string> = {
	Ранок: '🌅',
	День: '☀️',
	Вечір: '🌆',
	Ніч: '🌙'
};

// Reactive state using Svelte 5 $state rune
let _currentGame = $state<Game | null>(null);
let _games = $state<Game[]>([]);
let _isGenerating = $state(false);
let _statusText = $state('Gemini генерує відповідь...');
let _currentOptions = $state<string[]>([]);
let _pendingNewCharIds = $state<string[]>([]);
let _pendingManualCharIds = $state<string[]>([]);
let _pendingManualLocationIds = $state<string[]>([]);

export const gameState = {
	get currentGame() { return _currentGame; },
	set currentGame(v) { _currentGame = v; },

	get games() { return _games; },
	set games(v) { _games = v; },

	get isGenerating() { return _isGenerating; },
	set isGenerating(v) { _isGenerating = v; },

	get statusText() { return _statusText; },
	set statusText(v) { _statusText = v; },

	get currentOptions() { return _currentOptions; },
	set currentOptions(v) { _currentOptions = v; },

	get pendingNewCharIds() { return _pendingNewCharIds; },
	set pendingNewCharIds(v) { _pendingNewCharIds = v; },

	get pendingManualCharIds() { return _pendingManualCharIds; },
	set pendingManualCharIds(v) { _pendingManualCharIds = v; },

	get pendingManualLocationIds() { return _pendingManualLocationIds; },
	set pendingManualLocationIds(v) { _pendingManualLocationIds = v; },
};

// ─── Game list helpers ────────────────────────────────────────────────────────
export function saveLastActiveGameId(id: number) {
	if (id) localStorage.setItem('last_active_game_id', String(id));
}
export function getLastActiveGameId(): number | null {
	const saved = localStorage.getItem('last_active_game_id');
	return saved ? parseInt(saved) : null;
}

export async function refreshGameList(): Promise<void> {
	const games = await dbGetAllGames();
	_games = games;

	if (games.length === 0) {
		_currentGame = null;
		localStorage.removeItem('last_active_game_id');
		return;
	}

	if (!_currentGame && games.length > 0) {
		const lastId = getLastActiveGameId();
		const targetId = lastId && games.some((g) => g.id === lastId) ? lastId : games[games.length - 1].id!;
		await loadGameById(targetId);
	} else if (_currentGame) {
		_games = games;
		saveLastActiveGameId(_currentGame.id!);
	}
}

export async function loadGameById(id: number): Promise<void> {
	const games = await dbGetAllGames();
	const found = games.find((g) => g.id === id);
	if (found) {
		_currentGame = normalizeGame(found);
		saveLastActiveGameId(id);
	}
}

export function normalizeGame(game: Game): Game {
	const g = { ...game };
	g.day = typeof g.day === 'number' && g.day >= 1 ? g.day : 1;
	if (!g.locationName) g.locationName = g.location || '';
	if (!g.locationDescription) g.locationDescription = g.location || '';
	g.location = g.locationName || g.location || '';
	if (!Array.isArray(g.locations)) {
		g.locations = [];
		if (g.location) {
			g.locations.push({
				id: 'loc_' + Date.now(),
				name: g.locationName || g.location,
				description: g.locationDescription || g.location
			});
		}
	}
	return g;
}

// ─── Create New Game ──────────────────────────────────────────────────────────
export async function createNewGame(
	title: string,
	apiKey: string,
	model: string
): Promise<void> {
	const defaultPreset = SCENARIOS_PRESETS[0];
	let gameData: Record<string, unknown> | null = null;

	if (apiKey) {
		_isGenerating = true;
		_statusText = 'Створення світу та персонажів...';
		try {
			gameData = await callGeminiCreateWorld(title, apiKey, model);
		} catch (err) {
			console.error('AI error, using fallback preset', err);
		} finally {
			_isGenerating = false;
		}
	}

	if (!gameData) {
		gameData = {
			setting: defaultPreset.setting,
			locationName: defaultPreset.locationName || defaultPreset.location,
			locationDescription: defaultPreset.locationDescription || defaultPreset.location,
			location: defaultPreset.location,
			timeOfDay: defaultPreset.timeOfDay,
			objectives: defaultPreset.objectives,
			memory: defaultPreset.memory,
			maleCharacter: {
				name: defaultPreset.pName,
				surname: defaultPreset.pSurname,
				race: defaultPreset.pRace,
				age: defaultPreset.pAge,
				role: defaultPreset.pRole,
				personality: defaultPreset.pPersonality,
				appearance: defaultPreset.pApp
			},
			femaleCharacter: {
				name: defaultPreset.cName,
				surname: defaultPreset.cSurname,
				race: defaultPreset.cRace,
				age: defaultPreset.cAge,
				role: defaultPreset.cRole,
				personality: defaultPreset.cPersonality,
				appearance: defaultPreset.cApp
			}
		};
	}

	const male = gameData.maleCharacter as Record<string, unknown>;
	const female = gameData.femaleCharacter as Record<string, unknown>;
	const pId = 'player_' + Date.now();
	const cId = 'char_' + (Date.now() + 1);
	const locationName = ((gameData.locationName || gameData.location || 'Нова локація') as string).trim();
	const locationDescription = ((gameData.locationDescription || gameData.location || '') as string).trim();

	const newGame: Game = {
		title,
		setting: (gameData.setting as string || '').trim(),
		day: 1,
		locationName,
		locationDescription,
		location: locationName,
		timeOfDay: gameData.timeOfDay as string,
		objectives: gameData.objectives as string,
		memory: (gameData.memory as string)
			? (gameData.memory as string).startsWith('•')
				? (gameData.memory as string)
				: `• День 1, ${gameData.timeOfDay}, ${locationName}: ${gameData.memory}`
			: `• День 1, ${gameData.timeOfDay}, ${locationName}: Початок пригод.`,
		playerCharId: pId,
		isStarted: false,
		locations: [{ id: 'loc_' + Date.now(), name: locationName, description: locationDescription }],
		characters: [],
		messages: [
			{
				type: 'narration',
				text: `Світ створено. Персонажі: ${male.name} (${male.race || 'Людина'}) та ${female.name} (${female.race || 'Людина'}). Натисніть «Почати гру».`
			}
		]
	};

	const maleChar: Character = {
		id: pId,
		name: male.name as string,
		surname: (male.surname as string) || '',
		race: (male.race as string) || 'Людина',
		gender: 'Чоловіча',
		age: (male.age as number) || 25,
		role: (male.role as string) || '',
		personality: (male.personality as string) || '',
		appearance: (male.appearance as string) || '',
		relations: {}
	};
	maleChar.avatar = buildAvatarUrl(maleChar, newGame);

	const femaleChar: Character = {
		id: cId,
		name: female.name as string,
		surname: (female.surname as string) || '',
		race: (female.race as string) || 'Людина',
		gender: 'Жіноча',
		age: (female.age as number) || 24,
		role: (female.role as string) || '',
		personality: (female.personality as string) || '',
		appearance: (female.appearance as string) || '',
		relations: { [pId]: 45 }
	};
	femaleChar.avatar = buildAvatarUrl(femaleChar, newGame);

	newGame.characters = [maleChar, femaleChar];

	const id = await dbSaveGame(newGame);
	saveLastActiveGameId(id);
	_currentGame = { ...newGame, id };
	await refreshGameList();
}

// ─── Delete Current Game ──────────────────────────────────────────────────────
export async function deleteCurrentGame(): Promise<void> {
	if (!_currentGame) return;
	const deletedId = _currentGame.id!;
	await dbDeleteGame(deletedId);
	if (getLastActiveGameId() === deletedId) {
		localStorage.removeItem('last_active_game_id');
	}
	_currentGame = null;
	await refreshGameList();
}

// ─── Game State Updates ───────────────────────────────────────────────────────
export function updateCharRelation(charId: string, targetId: string, val: number): void {
	if (!_currentGame) return;
	const c = _currentGame.characters.find((ch) => ch.id === charId);
	if (c) {
		setRelation(c, targetId, val);
		dbSaveGame(_currentGame);
		// Trigger reactivity
		_currentGame = { ..._currentGame };
	}
}

export function updateCharData(charId: string, key: string, val: unknown): void {
	if (!_currentGame) return;
	const c = _currentGame.characters.find((ch) => ch.id === charId);
	if (c) {
		(c as unknown as Record<string, unknown>)[key] = key === 'age' ? parseInt(String(val)) || 0 : val;
		dbSaveGame(_currentGame);
		_currentGame = { ..._currentGame };
	}
}

export function addNewCharacter(): void {
	if (!_currentGame) return;
	const id = 'char_' + Date.now();
	const newChar: Character = {
		id,
		name: 'Новий',
		surname: 'Персонаж',
		race: 'Людина',
		gender: 'Чоловіча',
		age: 25,
		role: 'Персонаж',
		personality: 'Спокійний',
		appearance: 'Звичайний',
		pendingManualDeletion: _currentGame.isStarted,
		relations: {}
	};
	newChar.avatar = buildAvatarUrl(newChar, _currentGame);
	_currentGame.characters.push(newChar);
	if (_currentGame.isStarted) {
		_pendingNewCharIds = [..._pendingNewCharIds, id];
		_pendingManualCharIds = [..._pendingManualCharIds, id];
	}
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

export function deleteCharacter(charId: string): boolean {
	if (!_currentGame) return false;
	const char = _currentGame.characters.find((c) => c.id === charId);
	const canDelete =
		!_currentGame.isStarted || _pendingManualCharIds.includes(charId) || !!char?.pendingManualDeletion;
	if (!canDelete) return false;
	_currentGame.characters = _currentGame.characters.filter((c) => c.id !== charId);
	_pendingNewCharIds = _pendingNewCharIds.filter((pid) => pid !== charId);
	_pendingManualCharIds = _pendingManualCharIds.filter((pid) => pid !== charId);
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
	return true;
}

export function generateAvatar(charId: string): void {
	if (!_currentGame) return;
	const c = _currentGame.characters.find((ch) => ch.id === charId);
	if (!c) return;
	c.avatar = buildAvatarUrl(c, _currentGame);
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

export function uploadAvatarFile(charId: string, dataUrl: string): void {
	updateCharData(charId, 'avatar', dataUrl);
}

export function addNewLocation(): void {
	if (!_currentGame) return;
	if (!Array.isArray(_currentGame.locations)) _currentGame.locations = [];
	const id = 'loc_' + Date.now();
	_currentGame.locations.push({
		id,
		name: 'Нова локація',
		description: '',
		pendingManualDeletion: _currentGame.isStarted
	});
	if (_currentGame.isStarted) {
		_pendingManualLocationIds = [..._pendingManualLocationIds, id];
	}
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

export function updateLocationName(locId: string, val: string): void {
	if (!_currentGame || !Array.isArray(_currentGame.locations)) return;
	const loc = _currentGame.locations.find((l) => l.id === locId);
	if (!loc) return;
	loc.name = val.trim();
	const currentName = (_currentGame.locationName || _currentGame.location || '').trim().toLowerCase();
	if (currentName && loc.name.trim().toLowerCase() === currentName) {
		_currentGame.locationName = loc.name;
		_currentGame.location = loc.name;
	}
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

export function updateLocationDescription(locId: string, val: string): void {
	if (!_currentGame || !Array.isArray(_currentGame.locations)) return;
	const loc = _currentGame.locations.find((l) => l.id === locId);
	if (!loc) return;
	loc.description = val;
	const currentName = (_currentGame.locationName || _currentGame.location || '').trim().toLowerCase();
	if (currentName && loc.name && loc.name.trim().toLowerCase() === currentName) {
		_currentGame.locationDescription = val;
	}
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

export function deleteLocation(locId: string): boolean {
	if (!_currentGame || !Array.isArray(_currentGame.locations)) return false;
	const loc = _currentGame.locations.find((l) => l.id === locId);
	const canDelete =
		!_currentGame.isStarted || _pendingManualLocationIds.includes(locId) || !!loc?.pendingManualDeletion;
	if (!canDelete) return false;
	_currentGame.locations = _currentGame.locations.filter((l) => l.id !== locId);
	_pendingManualLocationIds = _pendingManualLocationIds.filter((pid) => pid !== locId);
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
	return true;
}

export function updateGameState(fields: Partial<Game>): void {
	if (!_currentGame) return;
	const oldTimeOfDay = _currentGame.timeOfDay;
	Object.assign(_currentGame, fields);

	if (_currentGame.timeOfDay === 'Ранок') {
		if (oldTimeOfDay !== 'Ранок') {
			_currentGame.pendingDayTransition = true;
		}
	} else {
		_currentGame.pendingDayTransition = false;
	}
	dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
}

// ─── Edit & Snapshot ──────────────────────────────────────────────────────────
export async function editLastUserMessage(index: number): Promise<string | null> {
	if (!_currentGame || !_currentGame.messages[index]) return null;
	const oldMessage = _currentGame.messages[index];
	const oldText = oldMessage.text;

	if (oldMessage.stateSnapshot) {
		restoreWorldStateSnapshot(_currentGame, oldMessage.stateSnapshot);
	}
	_currentGame.messages = _currentGame.messages.slice(0, index);
	_pendingNewCharIds = [];
	_pendingManualCharIds = [];
	_pendingManualLocationIds = [];

	await dbSaveGame(_currentGame);
	_currentGame = { ..._currentGame };
	return oldText;
}

// ─── Send Message ─────────────────────────────────────────────────────────────
export async function sendMessage(
	text: string,
	apiKey: string,
	model: string
): Promise<void> {
	if (!_currentGame || !_currentGame.isStarted || _isGenerating) return;

	if (_currentGame.pendingDayTransition && _currentGame.timeOfDay === 'Ранок') {
		_currentGame.day = (_currentGame.day || 1) + 1;
		_currentGame.pendingDayTransition = false;
	}

	_currentOptions = [];
	_pendingNewCharIds = [];
	_pendingManualCharIds = [];
	_pendingManualLocationIds = [];
	_currentGame.characters.forEach((c) => {
		if (c.pendingManualDeletion) delete c.pendingManualDeletion;
	});
	if (Array.isArray(_currentGame.locations)) {
		_currentGame.locations.forEach((l) => {
			if (l.pendingManualDeletion) delete l.pendingManualDeletion;
		});
	}

	const stateSnapshot = captureWorldStateSnapshot(_currentGame);
	_currentGame.messages.push({ type: 'user', text, stateSnapshot });
	_currentGame = { ..._currentGame };
	await dbSaveGame(_currentGame);

	_isGenerating = true;
	_statusText = 'Gemini створює відповідь...';
	try {
		await callGemini(_currentGame, text, apiKey, model, _pendingNewCharIds);
		_currentGame = { ..._currentGame };
	} finally {
		_isGenerating = false;
	}
}

export async function triggerContinue(apiKey: string, model: string): Promise<void> {
	if (!_currentGame || _isGenerating) return;

	if (_currentGame.pendingDayTransition && _currentGame.timeOfDay === 'Ранок') {
		_currentGame.day = (_currentGame.day || 1) + 1;
		_currentGame.pendingDayTransition = false;
		await dbSaveGame(_currentGame);
	}

	_currentOptions = [];
	_isGenerating = true;
	_statusText = 'Gemini генерує відповідь...';
	try {
		await callGemini(_currentGame, 'Продовжуй події далі...', apiKey, model, _pendingNewCharIds);
		_currentGame = { ..._currentGame };
	} finally {
		_isGenerating = false;
	}
}

export async function triggerOptions(apiKey: string, model: string): Promise<void> {
	if (!_currentGame || _isGenerating) return;

	if (_currentOptions.length > 0) {
		_currentOptions = [];
		return;
	}

	_isGenerating = true;
	_statusText = 'Генерація 5 варіантів дій...';
	try {
		_currentOptions = await callGeminiOptions(_currentGame, apiKey, model);
	} catch (e) {
		console.error(e);
	} finally {
		_isGenerating = false;
	}
}

export async function handleStartGame(apiKey: string, model: string): Promise<void> {
	if (!_currentGame || _isGenerating) return;

	_isGenerating = true;
	_statusText = 'Генерація старту пригоди...';
	try {
		await callGeminiStart(_currentGame, apiKey, model, _pendingNewCharIds);
		_currentGame = { ..._currentGame };
	} finally {
		_isGenerating = false;
	}
}

// ─── Import / Export ──────────────────────────────────────────────────────────
export function exportCurrentGame(): void {
	if (!_currentGame) return;
	const dataStr =
		'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(_currentGame, null, 2));
	const a = document.createElement('a');
	a.setAttribute('href', dataStr);
	a.setAttribute('download', `${_currentGame.title || 'game'}.json`);
	document.body.appendChild(a);
	a.click();
	a.remove();
}

export async function importGame(fileContent: string): Promise<void> {
	const importedGame: Game = JSON.parse(fileContent);
	delete importedGame.id;
	if (!importedGame.day || typeof importedGame.day !== 'number' || importedGame.day < 1) {
		importedGame.day = 1;
	}
	const id = await dbSaveGame(importedGame);
	saveLastActiveGameId(id);
	_currentGame = normalizeGame({ ...importedGame, id });
	await refreshGameList();

	// auto-respond if last message is from user
	if (
		_currentGame.isStarted &&
		_currentGame.messages.length > 0 &&
		_currentGame.messages[_currentGame.messages.length - 1].type === 'user'
	) {
		const apiKey = localStorage.getItem('gemini_api_key') || '';
		const model = localStorage.getItem('gemini_selected_model') || 'gemini-3.5-flash-lite';
		if (apiKey) {
			_isGenerating = true;
			try {
				const lastText = _currentGame.messages[_currentGame.messages.length - 1].text;
				await callGemini(_currentGame, lastText, apiKey, model, _pendingNewCharIds);
				_currentGame = { ..._currentGame };
			} finally {
				_isGenerating = false;
			}
		}
	}
}
