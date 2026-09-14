export interface Character {
	id: string;
	name: string;
	surname: string;
	race: string;
	gender: string;
	age: number;
	role: string;
	personality: string;
	appearance: string;
	avatar?: string;
	relations: Record<string, number>;
	initialRelationToPlayer?: number;
	pendingManualDeletion?: boolean;
}

export interface Location {
	id: string;
	name: string;
	description: string;
	pendingManualDeletion?: boolean;
}

export interface WorldStateSnapshot {
	memory: string;
	objectives: string;
	day: number;
	timeOfDay: string;
	pendingDayTransition?: boolean;
	location: string;
	locationName: string;
	locationDescription: string;
	locations: Location[];
	characters: Character[];
}

export interface Message {
	type: 'user' | 'narration' | 'character';
	text: string;
	charId?: string;
	charName?: string;
	relationAtMessage?: number;
	stateSnapshot?: WorldStateSnapshot;
}

export interface Game {
	id?: number;
	title: string;
	setting: string;
	day: number;
	locationName: string;
	locationDescription: string;
	location: string;
	timeOfDay: string;
	objectives: string;
	memory: string;
	playerCharId: string;
	isStarted: boolean;
	pendingDayTransition?: boolean;
	characters: Character[];
	locations: Location[];
	messages: Message[];
}

export type ScrollMode = 'bottom' | 'top' | 'preserve';
