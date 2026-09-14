import type { Game } from '../types';

const DB_NAME = 'MAIQuestDB';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;
let initPromise: Promise<void> | null = null;

export function initDB(): Promise<void> {
	if (db) return Promise.resolve();
	if (initPromise) return initPromise;

	initPromise = new Promise((resolve, reject) => {
		if (typeof indexedDB === 'undefined') {
			return resolve();
		}
		const request = indexedDB.open(DB_NAME, DB_VERSION);
		request.onupgradeneeded = (e) => {
			const database = (e.target as IDBOpenDBRequest).result;
			if (!database.objectStoreNames.contains('games')) {
				database.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
			}
		};
		request.onsuccess = (e) => {
			db = (e.target as IDBOpenDBRequest).result;
			resolve();
		};
		request.onerror = (e) => reject((e.target as IDBOpenDBRequest).error);
	});

	return initPromise;
}

async function ensureDB(): Promise<IDBDatabase | null> {
	if (!db) {
		await initDB();
	}
	return db;
}

export async function dbGetAllGames(): Promise<Game[]> {
	const database = await ensureDB();
	return new Promise((resolve) => {
		if (!database) return resolve([]);
		const tx = database.transaction('games', 'readonly');
		const store = tx.objectStore('games');
		const req = store.getAll();
		req.onsuccess = () => resolve(req.result as Game[]);
		req.onerror = () => resolve([]);
	});
}

export async function dbSaveGame(game: Game): Promise<number> {
	const database = await ensureDB();
	return new Promise((resolve, reject) => {
		if (!database) return resolve(0);
		const tx = database.transaction('games', 'readwrite');
		const store = tx.objectStore('games');
		const req = store.put(game);
		req.onsuccess = () => resolve(req.result as number);
		req.onerror = () => reject(req.error);
	});
}

export async function dbDeleteGame(id: number): Promise<void> {
	const database = await ensureDB();
	return new Promise((resolve, reject) => {
		if (!database) return resolve();
		const tx = database.transaction('games', 'readwrite');
		const store = tx.objectStore('games');
		const req = store.delete(id);
		req.onsuccess = () => resolve();
		req.onerror = () => reject(req.error);
	});
}
