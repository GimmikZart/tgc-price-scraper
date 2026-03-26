import { openDB, type DBSchema, type IDBPDatabase } from "idb";

interface DecksDB extends DBSchema {
  decks: {
    key: string;
    value: {
      name: string;
      slug: string;
      leader: string | null;
      cards: string[];
      visibility: string;
      location: string;
    };
    indexes: {
      "by-slug": string;
    };
  };
  gameAssets: {
    key: string;
    value: {
      key: string;
      game: string;
      asset: string;
      version: string | number | null;
      updatedAt: number;
      payload: unknown;
    };
    indexes: {
      "by-game": string;
    };
  };
}

const DECK_LOCAL_DB_NAME = "deck-builder";
const DECK_LOCAL_DB_VERSION = 2;

let deckLocalDbPromise: Promise<IDBPDatabase<DecksDB>> | null = null;

function initializeSchema(db: IDBPDatabase<DecksDB>, oldVersion: number) {
  if (oldVersion < 1 && !db.objectStoreNames.contains("decks")) {
    const store = db.createObjectStore("decks", { keyPath: "slug" });
    store.createIndex("by-slug", "slug");
  }

  if (oldVersion < 2 && !db.objectStoreNames.contains("gameAssets")) {
    const store = db.createObjectStore("gameAssets", { keyPath: "key" });
    store.createIndex("by-game", "game");
  }
}

async function openDeckLocalDb() {
  const db = await openDB<DecksDB>(DECK_LOCAL_DB_NAME, DECK_LOCAL_DB_VERSION, {
    upgrade(db, oldVersion) {
      initializeSchema(db, oldVersion);
    },
    blocked(currentVersion, blockedVersion) {
      console.warn("[deckLocalDb] open blocked", { currentVersion, blockedVersion });
    },
    blocking(currentVersion, blockedVersion) {
      console.warn("[deckLocalDb] connection is blocking a newer version", {
        currentVersion,
        blockedVersion,
      });
      resetDeckLocalDb();
    },
    terminated() {
      console.warn("[deckLocalDb] connection terminated unexpectedly");
      resetDeckLocalDb();
    },
  });

  db.addEventListener("versionchange", () => {
    db.close();
    resetDeckLocalDb();
  });

  db.addEventListener("close", () => {
    resetDeckLocalDb();
  });

  return db;
}

export async function getDeckLocalDb() {
  if (!import.meta.client) {
    throw new Error("IndexedDB non disponibile lato server.");
  }

  if (!deckLocalDbPromise) {
    deckLocalDbPromise = openDeckLocalDb().catch((error) => {
      resetDeckLocalDb();
      throw error;
    });
  }

  return deckLocalDbPromise;
}

export function resetDeckLocalDb() {
  deckLocalDbPromise = null;
}

export function isDeckLocalDbClosingError(error: unknown) {
  if (!error) return false;

  const name = typeof error === "object" && "name" in error
    ? String(error.name)
    : "";
  const message = error instanceof Error ? error.message : String(error);
  const normalizedMessage = message.toLowerCase();

  return name === "InvalidStateError"
    && normalizedMessage.includes("database connection is closing");
}
