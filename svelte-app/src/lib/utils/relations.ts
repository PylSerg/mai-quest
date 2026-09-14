import type { Character } from '../types';

export function getRelation(char: Character, targetId: string): number {
	if (!char || !char.relations || typeof char.relations !== 'object') return 50;
	const val = char.relations[targetId];
	return val !== undefined ? val : 50;
}

export function setRelation(char: Character, targetId: string, val: number | string): void {
	if (!char.relations || typeof char.relations !== 'object') char.relations = {};
	const num = Math.max(0, Math.min(100, parseInt(String(val)) || 0));
	char.relations[targetId] = num;
}

export function getRelClass(rel: number): string {
	if (rel >= 85) return 'rel-love';
	if (rel >= 70) return 'rel-friend';
	if (rel >= 55) return 'rel-friendly';
	if (rel >= 45) return 'rel-neutral';
	if (rel >= 30) return 'rel-suspicious';
	if (rel >= 15) return 'rel-hostile';
	return 'rel-hate';
}

export function getRelIcon(rel: number): string {
	if (rel >= 85) return '💖';
	if (rel >= 70) return '💚';
	if (rel >= 55) return '😊';
	if (rel >= 45) return '😐';
	if (rel >= 30) return '🤨';
	if (rel >= 15) return '😠';
	return '💀';
}

export function getRelDescription(rel: number): string {
	if (rel >= 95) return 'Інтимність / Глибока закоханість';
	if (rel >= 85) return 'Закоханість / Романтичні почуття';
	if (rel >= 70) return 'Щира дружба / Довіра';
	if (rel >= 55) return 'Симпатія / Прихильність';
	if (rel >= 45) return 'Нейтральне / Ділове';
	if (rel >= 30) return 'Стриманість / Підозра';
	if (rel >= 15) return 'Неприязнь / Ворожість';
	return 'Ненависть / Смертельний ворог';
}
