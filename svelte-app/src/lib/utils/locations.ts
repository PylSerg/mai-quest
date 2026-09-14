import type { Game, Location } from '../types';

export function normalizeLocationName(name: string): string {
	return String(name || '')
		.trim()
		.toLowerCase()
		.replace(/[«»""„"']/g, '')
		.replace(/\s+/g, ' ');
}

export function findKnownLocationByName(game: Game, name: string): Location | null {
	if (!game || !Array.isArray(game.locations)) return null;
	const target = normalizeLocationName(name);
	if (!target) return null;
	return game.locations.find((loc) => normalizeLocationName(loc.name) === target) || null;
}

export function setCurrentLocationByName(
	game: Game,
	name: string,
	description: string | null = null
): Location | null {
	const cleanName = String(name || '').trim();
	if (!cleanName) return null;
	if (!Array.isArray(game.locations)) game.locations = [];

	const existing = findKnownLocationByName(game, cleanName);
	if (existing) {
		game.locationName = existing.name;
		game.location = existing.name;
		if (description !== null && String(description).trim()) {
			existing.description = String(description).trim();
		}
		game.locationDescription = existing.description || '';
		return existing;
	}

	const newLocation: Location = {
		id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
		name: cleanName,
		description: description !== null ? String(description).trim() : ''
	};
	game.locations.push(newLocation);
	game.locationName = newLocation.name;
	game.location = newLocation.name;
	game.locationDescription = newLocation.description;
	return newLocation;
}
