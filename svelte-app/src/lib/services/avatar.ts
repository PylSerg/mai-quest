import type { Character, Game } from '../types';

export const FALLBACK_AVATAR =
	'data:image/svg+xml;utf8,' +
	encodeURIComponent(
		'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="32" fill="#3a3a46"/><circle cx="32" cy="24" r="12" fill="#8a8aa0"/><path d="M10 56c4-14 18-20 22-20s18 6 22 20" fill="#8a8aa0"/></svg>'
	);

const RACE_PROMPT_MAP: Record<string, string> = {
	людина: 'human',
	ельф: 'elf',
	ельфійка: 'elf',
	'напівельф': 'half-elf',
	дворф: 'dwarf',
	гном: 'gnome',
	орк: 'orc',
	'напіворк': 'half-orc',
	тролль: 'troll',
	вампір: 'vampire',
	демон: 'demon',
	ангел: 'angel',
	дракон: 'dragon-like humanoid',
	нежить: 'undead',
	фея: 'fairy'
};

const SETTING_PROMPT_RULES: { re: RegExp; hint: string }[] = [
	{
		re: /кіберпанк|cyberpunk|неон[ои]?в|synthwave/i,
		hint: 'cyberpunk setting, neon lights, futuristic street fashion, chrome and rain, no medieval clothing'
	},
	{
		re: /стімпанк|steampunk/i,
		hint: 'steampunk setting, victorian era with brass gears, goggles, retro-futuristic machines'
	},
	{
		re: /постапокал|post[- ]?apocalyp|wasteland|пуст[еи]л/i,
		hint: 'post-apocalyptic setting, worn scavenged clothing, dusty wasteland look'
	},
	{
		re: /космічн|sci[- ]?fi|science fiction|космос|space opera|зореліт|футурист/i,
		hint: 'science fiction setting, futuristic clothing, spacecraft aesthetic'
	},
	{
		re: /вестерн|western|дикий захід/i,
		hint: 'wild west setting, 19th century american frontier clothing'
	},
	{
		re: /пірат|pirate|кариб/i,
		hint: 'golden age of piracy setting, 18th century seafaring clothing'
	},
	{ re: /вікторіан|victorian/i, hint: 'victorian era setting, 19th century clothing' },
	{ re: /готик|gothic|вампірськ/i, hint: 'dark gothic setting, victorian gothic clothing' },
	{
		re: /сучасн|modern day|наш час|21 стол/i,
		hint: 'modern day setting, contemporary clothing, no period costume'
	},
	{
		re: /античн|давн(я|ьогрец)|єгипет|римськ|ancient (greece|rome|egypt)/i,
		hint: 'ancient historical setting, period-accurate clothing'
	},
	{
		re: /самурай|сьогун|сегун|феодальн(а|ій) япон/i,
		hint: 'feudal japan setting, period clothing, kimono or samurai attire'
	},
	{
		re: /середньовіч|medieval|фентезі|fantasy|лицар|дворф|таверн|замок|королівство/i,
		hint: 'medieval fantasy setting, period clothing, no modern items'
	}
];

function genderToPromptWord(gender: string): string {
	if (gender === 'Чоловіча') return 'male';
	if (gender === 'Жіноча') return 'female';
	return 'person';
}

function raceToPromptWord(race: string): string {
	const clean = (race || 'Людина').trim();
	return RACE_PROMPT_MAP[clean.toLowerCase()] || clean;
}

function inferSettingPromptHint(text: string): string {
	const haystack = (text || '').trim();
	if (!haystack) return '';
	const rule = SETTING_PROMPT_RULES.find((r) => r.re.test(haystack));
	return rule ? rule.hint : '';
}

export function getAvatarSettingHint(game: Game): string {
	const stored = (game.setting || '').trim();
	const corpus = [stored, game.title, game.objectives, game.locationName, game.locationDescription, game.location]
		.filter(Boolean)
		.join(' | ');
	const inferred = inferSettingPromptHint(corpus);
	if (inferred) return inferred;
	if (stored) return `${stored} setting, clothing and look matching this world`;
	return '';
}

export function buildAvatarPrompt(c: Character, game: Game): string {
	const genderWord = genderToPromptWord(c?.gender);
	const age = c?.age || 25;
	const race = raceToPromptWord(c?.race);
	const appearance = (c?.appearance || '').trim();
	const settingHint = getAvatarSettingHint(game);
	const promptParts = [
		'close-up portrait photo of a single person',
		`${age}-year-old ${genderWord} ${race}`,
		appearance,
		settingHint,
		'face clearly visible, looking at camera, detailed facial features, natural lighting, photorealistic, high quality, sharp focus'
	];
	return promptParts.filter(Boolean).join(', ');
}

export function buildAvatarUrl(c: Character, game: Game): string {
	const prompt = buildAvatarPrompt(c, game);
	const seed = Math.floor(Math.random() * 2147483647);
	return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&model=flux&nologo=true&seed=${seed}`;
}
