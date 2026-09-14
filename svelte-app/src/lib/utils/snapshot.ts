import type { Game, WorldStateSnapshot } from '../types';

export function deepClone<T>(obj: T): T {
	if (obj === undefined || obj === null) return obj;
	return JSON.parse(JSON.stringify(obj));
}

export function captureWorldStateSnapshot(game: Game): WorldStateSnapshot {
	return {
		memory: game.memory,
		objectives: game.objectives,
		day: game.day,
		timeOfDay: game.timeOfDay,
		pendingDayTransition: game.pendingDayTransition,
		location: game.location,
		locationName: game.locationName,
		locationDescription: game.locationDescription,
		locations: deepClone(game.locations),
		characters: deepClone(game.characters)
	};
}

export function restoreWorldStateSnapshot(game: Game, snapshot: WorldStateSnapshot): void {
	game.memory = snapshot.memory;
	game.objectives = snapshot.objectives;
	game.day = snapshot.day;
	game.timeOfDay = snapshot.timeOfDay;
	game.pendingDayTransition = snapshot.pendingDayTransition;
	game.location = snapshot.location;
	game.locationName = snapshot.locationName;
	game.locationDescription = snapshot.locationDescription;
	game.locations = deepClone(snapshot.locations) || [];
	game.characters = deepClone(snapshot.characters) || game.characters;
}

export function snapshotMessageRelations(game: Game, startIndex = 0): void {
	if (!Array.isArray(game.messages)) return;
	for (let i = Math.max(0, startIndex); i < game.messages.length; i++) {
		const message = game.messages[i];
		if (!message || message.type !== 'character' || !message.charId) continue;
		const char = game.characters.find((c) => c.id === message.charId);
		if (!char || char.id === game.playerCharId) continue;
		const rel = char.relations?.[game.playerCharId];
		message.relationAtMessage = rel !== undefined ? rel : 50;
	}
}
