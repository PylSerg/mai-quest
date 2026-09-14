import type { Game, Character } from '../types';
import { buildAvatarUrl } from './avatar';
import { dbSaveGame } from './db';
import { formatCharacterDetails, formatRecentHistory } from '../utils/history';
import { setRelation } from '../utils/relations';
import { setCurrentLocationByName, findKnownLocationByName } from '../utils/locations';
import { snapshotMessageRelations } from '../utils/snapshot';

export const TIME_STEPS = ['Ранок', 'День', 'Вечір', 'Ніч'];

export function findExistingCharacterMatch(game: Game, nc: Partial<Character>): Character | null {
	if (!nc) return null;
	if (nc.id) {
		const byId = game.characters.find((c) => c.id === nc.id);
		if (byId) return byId;
	}
	if (nc.name) {
		const fullName = `${nc.name} ${nc.surname || ''}`.trim().toLowerCase();
		if (fullName) {
			const byName = game.characters.find(
				(c) => `${c.name || ''} ${c.surname || ''}`.trim().toLowerCase() === fullName
			);
			if (byName) return byName;
		}
	}
	return null;
}

function addNewCharactersFromResult(
	game: Game,
	newCharacters: Partial<Character>[],
	pendingNewCharIds: string[]
) {
	newCharacters.forEach((nc) => {
		if (!nc || !nc.name) return;
		if (findExistingCharacterMatch(game, nc)) return;
		const newId = nc.id || 'char_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
		let initRel = 50;
		if (nc.initialRelationToPlayer !== undefined && nc.initialRelationToPlayer !== null) {
			initRel = Math.max(0, Math.min(100, parseInt(String(nc.initialRelationToPlayer)) || 50));
		} else if (nc.role && /ворог|розбійник|бандит|вбивця|монстр|культист|нападник/i.test(nc.role)) {
			initRel = 15;
		}
		const newCharObj: Character = {
			id: newId,
			name: nc.name,
			surname: nc.surname || '',
			race: nc.race || 'Людина',
			gender: nc.gender || 'Інша',
			age: parseInt(String(nc.age)) || 25,
			role: nc.role || 'Незнайомець',
			personality: nc.personality || 'Звичайний',
			appearance: nc.appearance || 'Звичайна',
			relations: { [game.playerCharId]: initRel }
		};
		newCharObj.avatar = buildAvatarUrl(newCharObj, game);
		game.characters.push(newCharObj);
		pendingNewCharIds.push(newId);
	});
}

function addNewLocationsFromResult(game: Game, newLocations: unknown[]) {
	if (!Array.isArray(game.locations)) game.locations = [];
	newLocations.forEach((nl) => {
		if (!nl) return;
		const locName = (typeof nl === 'string' ? nl : ((nl as Record<string, string>).name || '')).trim();
		const locDesc = (
			typeof nl === 'string' ? nl : ((nl as Record<string, string>).description || (nl as Record<string, string>).name || '')
		).trim();
		if (!locDesc) return;
		const existing =
			findKnownLocationByName(game, locName) ||
			game.locations.find(
				(l) => locDesc && l.description && l.description.trim().toLowerCase() === locDesc.toLowerCase()
			);
		if (!existing) {
			game.locations.push({
				id: 'loc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
				name: locName || locDesc.split('\n')[0].slice(0, 35),
				description: locDesc
			});
		} else if (locDesc && (!existing.description || existing.description === existing.name)) {
			existing.description = locDesc;
		}
		if (locName && locName.toLowerCase() === (game.locationName || game.location || '').toLowerCase()) {
			game.locationName = locName;
			game.location = locName;
			game.locationDescription = locDesc;
		}
	});
}

export async function callGeminiStart(
	game: Game,
	apiKey: string,
	model: string,
	pendingNewCharIds: string[]
): Promise<void> {
	const playerChar = game.characters.find((c) => c.id === game.playerCharId) || game.characters[0];
	const otherCharacters = game.characters.filter((c) => c.id !== playerChar.id);

	const systemPrompt = `
Ти — майстер інтерактивного рольового квесту.
НАЗВА КВЕСТУ: ${game.title}
ПОТОЧНИЙ ДЕНЬ: День ${game.day || 1} (Обов'язково враховуй поточний день у відповіді!)
ПОТОЧНА ЛОКАЦІЯ: ${game.locationName || game.location}
ОПИС ПОТОЧНОЇ ЛОКАЦІЇ: ${game.locationDescription || ''}
ПОТОЧНИЙ ЧАС ДОБИ: ${game.timeOfDay} (Обов'язково відповідай цьому часу доби!)
ЦІЛІ КВЕСТУ: ${game.objectives}
ПАМ'ЯТЬ КВЕСТУ: ${game.memory}

ПЕРСОНАЖІ:
${formatCharacterDetails(game, playerChar, true)}

${otherCharacters.map((c) => formatCharacterDetails(game, c, false)).join('\n\n')}

ПРАВИЛА:
1. ХАРАКТЕРИ ПЕРСОНАЖІВ — НАЙВИЩИЙ ПРІОРИТЕТ. Поведінка, реакції та мова повинні суворо відповідати їхнім характерам (наприклад: гордість, сарказм, йогоїзм, імпульсивність мають чітко проявлятися).
2. ДЕНЬ ТА ЧАС ДОБИ: Обов'язково враховуй поточний день (День ${game.day || 1}) та час доби (${game.timeOfDay}) при створенні стартової атмосфери, початку подій та опису оточення.
3. ВІДНОШЕННЯ (0-100%): Враховуй поточний рівень симпатії/довіри між персонажами.
   - При відношенні 85-94%: між персонажем та гравцем різної статі можуть виникати романтичні почуття — флірт, ніжність, натяки на взаємний потяг.
   - При відношенні 95-100%: можлива інтимна близькість між персонажем та гравцем (якщо вони різної статі та це органічно випливає з ситуації). Описуй художньо, але відверто та без цензури.
4. НОВІ ПЕРСОНАЖІ: Якщо на старті з'являються додаткові особи (наприклад, вороги, вартові, свідки), опиши їх у масиві "newCharacters".
   ВАЖЛИВО: у "newCharacters" вказуй ТІЛЬКИ персонажів, яких немає у переліку "ПЕРСОНАЖІ" вище. Гравця та вже перелічених персонажів НЕ додавай туди повторно.
   Встанови "initialRelationToPlayer" (0-100%):
   - Вороги, розбійники, монстри: 0-20% (ворожість/ненависть)
   - Підозрілі чужинці: 25-40%
   - Нейтральні містяни: 45-55%
   - Союзники/врятовані: 60-80%
5. Згенеруй стартову сцену, що занурює гравця в атмосферу та створює початковий виклик.
6. ЛОКАЦІЇ: Назву та опис стартової локації зберігай ОКРЕМО. У відповіді для початкових даних обов'язково поверни "locationName" як коротку назву та "locationDescription" як детальний опис. Не змішуй назву з описом.

Поверни JSON:
{
  "messages": [{ "type": "narration", "text": "Опис початкової ситуації..." }],
  "newCharacters": [
    {
      "id": "char_id",
      "name": "Ім'я",
      "surname": "Прізвище",
      "race": "Людина/Ельф...",
      "gender": "Чоловіча/Жіноча/Інша",
      "age": 30,
      "role": "Роль",
      "personality": "Характер",
      "appearance": "Зовнішність",
      "initialRelationToPlayer": 15
    }
  ] або null,
  "newLocations": [
    {
      "name": "Назва локації",
      "description": "Детальний опис локації..."
    }
  ] або null,
  "updatedMemory": "Оновлена пам'ять або null",
  "updatedObjectives": "Оновлені цілі або null",
  "newLocation": "Поточна назва локації або null",
  "newTimeOfDay": "Ранок або День або Вечір або Ніч або null"
}`;

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
				generationConfig: { responseMimeType: 'application/json' }
			})
		}
	);
	if (!response.ok) throw new Error('HTTP ' + response.status);
	const data = await response.json();
	const result = JSON.parse(data.candidates[0].content.parts[0].text);

	const openingMessageStartIndex = game.messages.length;

	if (result.newCharacters && Array.isArray(result.newCharacters)) {
		addNewCharactersFromResult(game, result.newCharacters, pendingNewCharIds);
	}

	if (result.messages && Array.isArray(result.messages)) {
		result.messages.forEach((msg: { type: string; text: string; charId?: string }) => {
			if (msg.type === 'narration') game.messages.push({ type: 'narration', text: msg.text });
			else if (msg.type === 'character') {
				const char = game.characters.find((c) => c.id === msg.charId) || game.characters[0];
				game.messages.push({ type: 'character', charId: char.id, text: msg.text });
			}
		});
	}

	snapshotMessageRelations(game, openingMessageStartIndex);
	if (result.updatedMemory) game.memory = result.updatedMemory;
	if (result.updatedObjectives) game.objectives = result.updatedObjectives;
	if (result.newLocation && result.newLocation.trim()) {
		setCurrentLocationByName(game, result.newLocation.trim());
	}
	if (!Array.isArray(game.locations)) game.locations = [];
	if (result.newLocations && Array.isArray(result.newLocations)) {
		addNewLocationsFromResult(game, result.newLocations);
	}
	if (result.newTimeOfDay && TIME_STEPS.includes(result.newTimeOfDay)) {
		if (result.newTimeOfDay === 'Ранок' && game.timeOfDay !== 'Ранок') {
			game.day = (game.day || 1) + 1;
		}
		game.timeOfDay = result.newTimeOfDay;
	}

	game.isStarted = true;
	await dbSaveGame(game);
}

export async function callGemini(
	game: Game,
	text: string,
	apiKey: string,
	model: string,
	pendingNewCharIds: string[]
): Promise<void> {
	const playerChar = game.characters.find((c) => c.id === game.playerCharId) || {
		name: 'Гравець',
		surname: '',
		id: 'player'
	};
	const otherCharacters = game.characters.filter((c) => c.id !== game.playerCharId);

	const systemPrompt = `
Ти — провідний майстер інтерактивного рольового квесту. Проаналізуй дію гравця, зміни в оточенні та дай детальну художню відповідь.

ПОТОЧНИЙ СТАН СВІТУ:
- Назва: ${game.title}
- Поточний день: День ${game.day || 1} (СУВОРО ВРАХОВУЙ У ВІДПОВІДІ!)
- Назва поточної локації: ${game.locationName || game.location}
- Опис поточної локації: ${game.locationDescription || ''}
- Відомі локації: ${game.locations && game.locations.length > 0 ? game.locations.map((l) => (l.name ? `«${l.name}»` : '') + (l.description ? `: ${l.description}` : '')).join('; ') : game.location}
- ВАЖЛИВО: якщо місце вже є у списку "Відомі локації", вважай це тією самою локацією навіть при поверненні до неї. Не створюй дублікат лише через новий опис сцени.
- Час доби: ${game.timeOfDay} (СУВОРО ДОТРИМУЙСЯ!)
- Цілі квесту: ${game.objectives || 'Немає'}
- Пам'ять квесту: ${game.memory || 'Немає'}

ГРАВЕЦЬ:
${formatCharacterDetails(game, playerChar as Character, true)}

ПРИСУТНІ ПЕРСОНАЖІ:
${otherCharacters.length > 0 ? otherCharacters.map((c) => formatCharacterDetails(game, c, false)).join('\n\n') : 'Немає'}

КРИТИЧНО ВАЖЛИВІ ПРАВИЛА:
0. ТЕМП РОЗВИТКУ ПОДІЙ — АБСОЛЮТНИЙ ПРІОРИТЕТ. ЗАБОРОНЕНО поспішати та стискати сюжет:
   - Кожна сцена розгортається ПОСТУПОВО: спочатку атмосфера, потім реакція персонажів, потім наслідки. Не перескакуй через етапи.
   - Відповідь на ОДИН хід гравця — це ОДИН момент часу, не вся арка сюжету. Не завершуй конфлікти, романтичні лінії чи квестові цілі самостійно без активної участі гравця в кожному кроці.
   - Якщо гравець ще не зробив достатньо дій для значного прогресу — УТРИМУЙ напругу, давай персонажам реагувати стримано чи двозначно, не розкривай усіх карт.
   - ЗАБОРОНЕНО за одну відповідь: одночасно зізнаватися у коханні, цілуватись і доводити до інтимної сцени. Кожен крок має бути окремим ходом гравця.
1. ХАРАКТЕР ПЕРСОНАЖІВ — НАЙВИЩИЙ ПРІОРИТЕТ. Кожен персонаж ОБОВ'ЯЗКОВО поводиться, мислить та говорить відповідно до свого прописаного характеру (темперамент, гострота на язик, гордість, егоїзм, підозрілість, пристрасті). Заборонено робити гордих або підступних персонажів надмірно люб'язними чи покірними лише через просту дію або посмішку гравця!
2. ВІДНОШЕННЯ (0-100%): Відношення персонажів до гравця та ОДИН ДО ОДНОГО змінюється динамічно відповідно до їхніх характерів, вчинків та слів:
   - Горді/егоїстичні/підозрілі персонажі підвищують відношення ДУЖЕ повільно й вимогливо (лише за реальну допомогу, повагу чи вигоду), але можуть швидко знизити його через зневагу, фальш чи образу.
   - ВІДНОШЕННЯ МІЖ NPC: якщо дія гравця чи події впливають на відносини між двома NPC (наприклад, один рятує іншого, або між ними виникає конфлікт), ти ОБОВ'ЯЗКОВО також оновлюєш їхні відношення між собою.
   - РОМАНТИКА ТА ІНТИМНІСТЬ: між персонажем та гравцем РІЗНОЇ СТАТІ романтичні й інтимні стосунки є природними та ДОЗВОЛЕНИМИ без будь-яких обмежень:
     • 85-94% — флірт, ніжність, романтична напруга, поцілунки, взаємний потяг, натяки на бажання.
     • 95-100% — повна інтимна близькість. Описуй художньо, чуттєво та ВІДВЕРТО (без цензури та самоцензури), якщо це органічно виникає з ситуації та ініційовано гравцем або накопичилося через стосунки.
     Романтика повинна розвиватися природно відповідно до характеру персонажа: гордий персонаж піддасться повільно та з боротьбою з собою; імпульсивний — може зробити перший крок сам.
   - Якщо внаслідок цієї сцени/діалогу відношення будь-яких персонажів до гравця чи один до одного змінилося, ОБОВ'ЯЗКОВО поверни об'єкт "updatedRelations".
     Формат: { "ID_персонажа_джерела": { "ID_цілі": нове_число_від_0_до_100 } }
     Приклад (відношення до гравця + між NPC): { "${otherCharacters[0] ? otherCharacters[0].id : 'char_id'}": { "${playerChar.id}": 42${otherCharacters[1] ? `, "${otherCharacters[1].id}": 35` : ''} } }
     Якщо відношення не змінилися, поверни null.
3. ПОЯВА НОВИХ ПЕРСОНАЖІВ: Якщо в сцені з'являється новий персонаж, обов'язково додай його опис у масив "newCharacters".
   ВАЖЛИВО: у "newCharacters" вказуй ТІЛЬКИ персонажів, яких справді ще немає серед "ГРАВЕЦЬ" та "ПРИСУТНІ ПЕРСОНАЖІ" вище.
   Встанови його "initialRelationToPlayer" (0-100%) відповідно до контексту:
   - Вороги, розбійники, агресивні монстри, вбивці: 0-20%
   - Підозрілі вартові, холодні чужинці, конкуренти: 25-40%
   - Звичайні містяни, нейтральні торговці: 45-55%
   - Врятовані, потенційні союзники, друзі: 60-80%
4. ПОТОЧНИЙ ДЕНЬ ТА ЧАС ДОБИ:
   - ОБОВ'ЯЗКОВО ВРАХОВУЙ ПОТОЧНИЙ ДЕНЬ (День ${game.day || 1}) та ЧАС ДОБИ (${game.timeOfDay}) у відповіді.
   - Якщо настає ранок наступного дня або минає доба чи більше, обов'язково відобрази це в оповіді, онови "newTimeOfDay" та поверни оновлений номер дня у "newDay" (наприклад: ${(game.day || 1) + 1}).
   - Якщо день не змінився, поверни "newDay": null. Якщо час доби не змінився, поверни "newTimeOfDay": null.
5. ЛОКАЦІЯ ТА ПОДОРОЖ:
   - Якщо гравець або персонажі переміщуються, йдуть в інше місце чи подорожують, обов'язково поверни нову назву локації у полі "newLocation". Якщо локація не змінилася, поверни null.
   - ПЕРЕД створенням будь-якої нової локації ОБОВ'ЯЗКОВО перевір список "Відомі локації" вище. Якщо така локація вже існує, НЕ створюй дублікат.
   - "newLocations" має містити ТІЛЬКИ локації, яких ще немає у "Відомих локаціях".
   - Якщо в сцені з'являється справді нова локація, додай її у "newLocations" з ОКРЕМИМИ полями "name" (коротка назва) і "description" (детальний опис).
6. ПАМ'ЯТЬ ТА ЦІЛІ: Якщо трапилася важлива подія, запиши короткий факт у "newMemoryEntry". Зверни увагу на формат: спочатку день, потім час доби, потім назва поточної локації, а вже потім примітка (наприклад: "День ${game.day || 1}, ${game.timeOfDay}, ${game.locationName || game.location}: Знайшли зашифровану карту"). Якщо оновилися цілі, вкажи їх у "updatedObjectives".

ОСТАННІЙ КОНТЕКСТ ДІАЛОГУ ТА ПОДІЙ:
${formatRecentHistory(game, 8)}

ОСТАННЯ ДІЯ АБО СЛОВА ГРАВЦЯ (${playerChar.name}):
"${text}"

ПОВЕРНИ ВІДПОВІДЬ ВИКЛЮЧНО У ФОРМАТІ JSON:
{
  "messages": [
    { "type": "narration", "text": "Художній опис подій, наслідків дій та оточення..." },
    { "type": "character", "charId": "ID персонажа з переліку вище", "charName": "Ім'я", "text": "Пряма мова персонажа, суворо витримана в його унікальному характері..." }
  ],
  "newCharacters": [
    {
      "id": "char_новий_id",
      "name": "Ім'я",
      "surname": "Прізвище",
      "race": "Раса",
      "gender": "Чоловіча/Жіноча/Інша",
      "age": 28,
      "role": "Роль (наприклад: Головоріз, Вартовий, Торговець)",
      "personality": "Характер",
      "appearance": "Зовнішність",
      "initialRelationToPlayer": 15
    }
  ] або null,
  "updatedRelations": { "ID_персонажа": { "ID_цілі": 55 } } або null,
  "newLocation": "Нова назва локації, якщо відбулося переміщення або null",
  "newLocations": [
    {
      "name": "Назва локації",
      "description": "Детальний опис локації..."
    }
  ] або null,
  "newDay": ${(game.day || 1) + 1} (новий номер дня, якщо настав наступний день/минула доба, інакше null),
  "newTimeOfDay": "Ранок або День або Вечір або Ніч (якщо час доби змінився) або null",
  "newMemoryEntry": "День ${game.day || 1}, ${game.timeOfDay}, ${game.locationName || game.location}: Короткий новий факт для пам'яті (або null)",
  "updatedObjectives": "Оновлені цілі або null"
}`;

	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
				generationConfig: { responseMimeType: 'application/json' }
			})
		}
	);
	if (!response.ok) throw new Error('HTTP ' + response.status);
	const data = await response.json();
	const result = JSON.parse(data.candidates[0].content.parts[0].text);
	const responseMessageStartIndex = game.messages.length;

	// Add new characters
	if (result.newCharacters && Array.isArray(result.newCharacters)) {
		addNewCharactersFromResult(game, result.newCharacters, pendingNewCharIds);
	}

	// Add messages
	if (result.messages && Array.isArray(result.messages)) {
		result.messages.forEach((msg: { type: string; text: string; charId?: string; charName?: string }) => {
			if (msg.type === 'narration') {
				game.messages.push({ type: 'narration', text: msg.text });
			} else if (msg.type === 'character') {
				let targetChar = game.characters.find((c) => c.id === msg.charId);
				if (!targetChar && msg.charName) {
					targetChar = game.characters.find((c) =>
						(c.name + ' ' + c.surname).toLowerCase().includes(msg.charName!.toLowerCase())
					);
				}
				if (!targetChar) {
					const newId = 'char_' + Date.now();
					const roleName = msg.charName || 'Незнайомець';
					const isEnemy = /ворог|розбійник|бандит|вбивця|монстр|культист|нападник/i.test(roleName);
					targetChar = {
						id: newId,
						name: msg.charName || 'Незнайомець',
						surname: '',
						race: 'Людина',
						gender: 'Інша',
						age: 30,
						role: roleName,
						personality: isEnemy ? 'Ворожий та агресивний' : 'Спокійний',
						appearance: '',
						relations: { [game.playerCharId]: isEnemy ? 15 : 50 }
					};
					targetChar.avatar = buildAvatarUrl(targetChar, game);
					game.characters.push(targetChar);
					pendingNewCharIds.push(newId);
				}
				game.messages.push({ type: 'character', charId: targetChar.id, text: msg.text });
			}
		});
	}

	// Update relations
	if (result.updatedRelations && typeof result.updatedRelations === 'object') {
		for (const [sourceId, targetMap] of Object.entries(result.updatedRelations)) {
			const char = game.characters.find(
				(c) => c.id === sourceId || (c.name && sourceId.includes(c.name))
			);
			if (char) {
				if (typeof targetMap === 'number') {
					setRelation(char, game.playerCharId, targetMap as number);
				} else if (typeof targetMap === 'object' && targetMap !== null) {
					for (const [targetId, val] of Object.entries(targetMap as Record<string, number>)) {
						const realTarget = game.characters.find(
							(c) => c.id === targetId || (c.name && targetId.includes(c.name))
						);
						const targetKey = realTarget
							? realTarget.id
							: targetId === 'player' || targetId === 'Гравець'
								? game.playerCharId
								: targetId;
						setRelation(char, targetKey, val);
					}
				}
			}
		}
	}

	snapshotMessageRelations(game, responseMessageStartIndex);

	// Location updates
	if (result.newLocation && typeof result.newLocation === 'string' && result.newLocation.trim()) {
		setCurrentLocationByName(game, result.newLocation.trim());
	}
	if (!Array.isArray(game.locations)) game.locations = [];
	if (result.newLocations && Array.isArray(result.newLocations)) {
		addNewLocationsFromResult(game, result.newLocations);
	}

	const currentLocationName = game.locationName || game.location;
	if (currentLocationName) {
		const currentLocationRecord = findKnownLocationByName(game, currentLocationName);
		if (currentLocationRecord) {
			game.locationName = currentLocationRecord.name;
			game.location = currentLocationRecord.name;
			game.locationDescription = currentLocationRecord.description || game.locationDescription || '';
		} else {
			setCurrentLocationByName(game, currentLocationName, game.locationDescription || '');
		}
	}

	// Day/time updates
	let dayWasSet = false;
	if (result.newDay !== undefined && result.newDay !== null) {
		const rawNewDay = String(result.newDay).trim().toLowerCase();
		if (rawNewDay !== '' && rawNewDay !== 'null' && rawNewDay !== 'undefined') {
			const parsedDay =
				typeof result.newDay === 'number'
					? result.newDay
					: parseInt(rawNewDay.replace(/\D/g, ''), 10);
			if (!isNaN(parsedDay) && parsedDay >= 1) {
				game.day = parsedDay;
				dayWasSet = true;
			}
		}
	}
	if (!dayWasSet && result.newTimeOfDay && TIME_STEPS.includes(result.newTimeOfDay)) {
		if (result.newTimeOfDay === 'Ранок' && game.timeOfDay !== 'Ранок') {
			game.day = (game.day || 1) + 1;
			dayWasSet = true;
		}
	}

	if (result.newTimeOfDay && TIME_STEPS.includes(result.newTimeOfDay)) {
		game.timeOfDay = result.newTimeOfDay;
		game.pendingDayTransition = false;
	}

	if (result.updatedObjectives && typeof result.updatedObjectives === 'string' && result.updatedObjectives.trim()) {
		game.objectives = result.updatedObjectives.trim();
	}

	if (result.newMemoryEntry && typeof result.newMemoryEntry === 'string' && result.newMemoryEntry.trim()) {
		let entry = result.newMemoryEntry.trim().replace(/^[•\-\*]\s*/, '');
		const dayPrefixRegex = /^\[?\s*день\s*\d+[^:]*:\s*/i;
		let cleanedText = entry;
		if (dayPrefixRegex.test(entry)) {
			cleanedText = entry.replace(dayPrefixRegex, '').trim();
		}
		const locName = game.location || 'Локація';
		const formattedEntry = `День ${game.day || 1}, ${game.timeOfDay}, ${locName}: ${cleanedText}`;
		game.memory = (game.memory ? game.memory + '\n• ' : '• ') + formattedEntry;
	}

	await dbSaveGame(game);
}

export async function callGeminiOptions(
	game: Game,
	apiKey: string,
	model: string
): Promise<string[]> {
	const playerChar = game.characters.find((c) => c.id === game.playerCharId) || {
		name: 'Гравець',
		personality: '',
		gender: '',
		age: '',
		role: '',
		appearance: ''
	};

	const promptText = `На основі поточної ситуації в грі (Поточний день: День ${game.day || 1}, Локація: ${game.location}, Час доби: ${game.timeOfDay}, Пам'ять: ${game.memory}) запропонуй рівно 5 різних можливих варіантів дій або реплік для мого персонажа ${(playerChar as Character).name} (стать: ${(playerChar as Character).gender || 'не вказана'}, вік: ${(playerChar as Character).age || 'не вказаний'}, роль/фах: ${(playerChar as Character).role || 'не вказана'}, зовнішність: ${(playerChar as Character).appearance || 'не вказана'}, характер: ${(playerChar as Character).personality || 'звичайний'}). 
Останній контекст:
${formatRecentHistory(game, 5)}

ВАЖЛИВО: Кожен варіант ОБОВ'ЯЗКОВО пиши від першої особи (від імені гравця), так, ніби це сам гравець описує свою дію або репліку. Наприклад: "Я підходжу ближче і питаю, що тут сталося." або "Я кажу: «Довірся мені»." Не використовуй третю особу.
ОБОВ'ЯЗКОВО узгоджуй рід дієслів минулого/доконаного виду з статтю персонажа (${(playerChar as Character).gender || 'не вказана'}): якщо стать "Чоловіча" — використовуй чоловічий рід (напр. "я підійшов", "я сказав", "я зробив"); якщо стать "Жіноча" — жіночий рід (напр. "я підійшла", "я сказала", "я зробила").
Враховуй вік, роль/фах та зовнішність персонажа: варіанти дій мають відповідати його можливостям, манері поведінки та тому, як він фізично міг би діяти в цій ситуації.

Поверни JSON: { "options": ["варіант 1 від першої особи", "варіант 2 від першої особи", "варіант 3 від першої особи", "варіант 4 від першої особи", "варіант 5 від першої особи"] }`;

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: promptText }] }],
				generationConfig: { responseMimeType: 'application/json' }
			})
		}
	);
	if (!res.ok) throw new Error('HTTP ' + res.status);
	const data = await res.json();
	const result = JSON.parse(data.candidates[0].content.parts[0].text);
	return result.options || [];
}

export async function callGeminiCreateWorld(
	title: string,
	apiKey: string,
	model: string
): Promise<Record<string, unknown> | null> {
	const promptGen = `Створи початковий світ та 2 головних персонажів для квесту: "${title}". Поверни JSON з полями:
    {
      "setting": "короткий візуальний стиль світу англійською для портретів (medieval fantasy / cyberpunk / post-apocalyptic / space opera / modern day / victorian / wild west / тощо)",
      "locationName": "назва локації", "locationDescription": "детальний опис локації", "timeOfDay": "Ранок або День або Вечір або Ніч", "objectives": "цілі", "memory": "пам'ять",
      "maleCharacter": { "name": "", "surname": "", "race": "Людина / Ельф / інша", "age": 25, "role": "", "personality": "", "appearance": "", "seed": "m1" },
      "femaleCharacter": { "name": "", "surname": "", "race": "Людина / Ельф / інша", "age": 24, "role": "", "personality": "", "appearance": "", "seed": "f1" }
    }
    Зовнішність персонажів має відповідати setting (одяг, зброя, деталі епохи).`;

	const res = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
		{
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ role: 'user', parts: [{ text: promptGen }] }],
				generationConfig: { responseMimeType: 'application/json' }
			})
		}
	);
	if (!res.ok) return null;
	const data = await res.json();
	return JSON.parse(data.candidates[0].content.parts[0].text);
}
