import type { Game, Character } from '../types';
import { getRelation, getRelDescription } from './relations';

export function formatCharacterDetails(game: Game, c: Character, isPlayer = false): string {
	let relText = '';
	if (!isPlayer && game) {
		const playerChar = game.characters.find((ch) => ch.id === game.playerCharId) || {
			name: 'Гравець',
			id: 'player'
		};
		const relToPlayer = getRelation(c, playerChar.id);
		const otherNPCs = game.characters.filter(
			(other) => other.id !== c.id && other.id !== playerChar.id
		);
		const otherRels = otherNPCs
			.map(
				(other) =>
					`    • До ${other.name} (ID: "${other.id}"): ${getRelation(c, other.id)}/100 (${getRelDescription(getRelation(c, other.id))})`
			)
			.join('\n');

		relText = `\n  - ВІДНОШЕННЯ (0-100%):
    • До гравця ${playerChar.name} (ID: "${playerChar.id}"): ${relToPlayer}/100 [${getRelDescription(relToPlayer)}]${otherRels ? '\n' + otherRels : ''}`;
	}

	return `• ${isPlayer ? '[ГРАВЕЦЬ] ' : ''}ID: "${c.id}"
  - Ім'я: ${c.name || ''} ${c.surname || ''}
  - Раса: ${c.race || 'Людина'}
  - Стать: ${c.gender || 'Невідома'}
  - Вік: ${c.age || 'Невідомий'}
  - Роль / фах: ${c.role || 'Невідомо'}
  - ХАРАКТЕР (НАЙВИЩИЙ ПРІОРИТЕТ): ${c.personality || 'Звичайний'}
  - Зовнішність та спорядження: ${c.appearance || 'Звичайна'}${relText}`;
}

export function formatRecentHistory(game: Game, maxMessages = 10): string {
	if (!game || !game.messages || game.messages.length === 0) return 'Історія поки що порожня.';
	const slice = game.messages.slice(-maxMessages);
	return slice
		.map((m) => {
			if (m.type === 'user') {
				const p = game.characters.find((c) => c.id === game.playerCharId);
				const name = p ? `${p.name} ${p.surname}` : 'Гравець';
				return `[${name}]: ${m.text}`;
			} else if (m.type === 'narration') {
				return `[Оповідач]: ${m.text}`;
			} else if (m.type === 'character') {
				const c = game.characters.find((ch) => ch.id === m.charId);
				const name = c ? `${c.name} ${c.surname}` : m.charName || 'Персонаж';
				return `[${name}]: ${m.text}`;
			}
			return m.text;
		})
		.join('\n');
}
