import path from "path";
import type { Pool } from "pg";

const DB_PATH = path.join(process.cwd(), "data", "debates.db");

function resolveStorageProvider() {
  if (process.env.APP_STORAGE) return process.env.APP_STORAGE;
  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) return "postgres";
  if (process.env.VERCEL) return "memory";
  return "sqlite";
}

const STORAGE_PROVIDER = resolveStorageProvider();

export interface DebateRecord {
  id: string;
  topic: string;
  agents_output: string;
  created_at: string;
  user_pin?: string;
}

export interface AgentChatRecord {
  id: string;
  agent_id: string;
  title: string;
  messages: string;
  created_at: string;
  updated_at: string;
  user_pin?: string;
}

type StorageAdapter = {
  provider: string;
  initialize: () => Promise<void>;
  insertDebate: (id: string, topic: string, agentsOutput: object[], userPin?: string) => Promise<void>;
  getAllDebates: (userPin?: string) => Promise<DebateRecord[]>;
  getDebateById: (id: string) => Promise<DebateRecord | undefined>;
  deleteDebate: (id: string) => Promise<boolean>;
  upsertAgentChat: (id: string, agentId: string, title: string, messages: object[], userPin?: string) => Promise<void>;
  getAgentChats: (agentId?: string, userPin?: string) => Promise<AgentChatRecord[]>;
  getAgentChatById: (id: string) => Promise<AgentChatRecord | undefined>;
  deleteAgentChat: (id: string) => Promise<boolean>;
};

let adapter: StorageAdapter | null = null;
let initializePromise: Promise<void> | null = null;

function now() {
  return new Date().toISOString();
}

function getStorageAdapter(): StorageAdapter {
  if (!adapter) {
    if (STORAGE_PROVIDER === "postgres") adapter = createPostgresAdapter();
    else if (STORAGE_PROVIDER === "memory") adapter = createMemoryAdapter();
    else adapter = createSqliteAdapter();
  }
  return adapter;
}

async function ensureInitialized() {
  if (!initializePromise) {
    initializePromise = getStorageAdapter().initialize();
  }
  await initializePromise;
}

function createMemoryAdapter(): StorageAdapter {
  const debates = new Map<string, DebateRecord>();
  const agentChats = new Map<string, AgentChatRecord>();

  return {
    provider: "memory",
    async initialize() {},
    async insertDebate(id, topic, agentsOutput, userPin) {
      debates.set(id, {
        id,
        topic,
        agents_output: JSON.stringify(agentsOutput),
        created_at: now(),
        user_pin: userPin,
      });
    },
    async getAllDebates(userPin) {
      const items = [...debates.values()];
      const filtered = userPin ? items.filter((d) => d.user_pin === userPin) : items;
      return filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));
    },
    async getDebateById(id) {
      return debates.get(id);
    },
    async deleteDebate(id) {
      return debates.delete(id);
    },
    async upsertAgentChat(id, agentId, title, messages, userPin) {
      const existing = agentChats.get(id);
      agentChats.set(id, {
        id,
        agent_id: agentId,
        title,
        messages: JSON.stringify(messages),
        created_at: existing?.created_at || now(),
        updated_at: now(),
        user_pin: userPin || existing?.user_pin,
      });
    },
    async getAgentChats(agentId, userPin) {
      const items = [...agentChats.values()];
      let filtered = agentId ? items.filter((item) => item.agent_id === agentId) : items;
      if (userPin) filtered = filtered.filter((item) => item.user_pin === userPin);
      return filtered.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
    },
    async getAgentChatById(id) {
      return agentChats.get(id);
    },
    async deleteAgentChat(id) {
      return agentChats.delete(id);
    },
  };
}

function createSqliteAdapter(): StorageAdapter {
  type DatabaseModule = typeof import("better-sqlite3");
  let db: import("better-sqlite3").Database | null = null;

  function getDb() {
    if (!db) {
      const fs = require("fs");
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const Database = require("better-sqlite3") as DatabaseModule;
      db = new Database(DB_PATH);
      db.pragma("journal_mode = WAL");
    }

    return db;
  }

  return {
    provider: "sqlite",
    async initialize() {
      const database = getDb();
      database.exec(`
        CREATE TABLE IF NOT EXISTS debates (
          id TEXT PRIMARY KEY,
          topic TEXT NOT NULL,
          agents_output TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);

      database.exec(`
        CREATE TABLE IF NOT EXISTS agent_chats (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          messages TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
    },
    async insertDebate(id, topic, agentsOutput) {
      getDb()
        .prepare("INSERT INTO debates (id, topic, agents_output, created_at) VALUES (?, ?, ?, datetime('now'))")
        .run(id, topic, JSON.stringify(agentsOutput));
    },
    async getAllDebates() {
      return getDb()
        .prepare("SELECT id, topic, agents_output, created_at FROM debates ORDER BY created_at DESC")
        .all() as DebateRecord[];
    },
    async getDebateById(id) {
      return getDb().prepare("SELECT id, topic, agents_output, created_at FROM debates WHERE id = ?").get(id) as
        | DebateRecord
        | undefined;
    },
    async deleteDebate(id) {
      return getDb().prepare("DELETE FROM debates WHERE id = ?").run(id).changes > 0;
    },
    async upsertAgentChat(id, agentId, title, messages) {
      const existing = getDb().prepare("SELECT id FROM agent_chats WHERE id = ?").get(id);
      if (existing) {
        getDb()
          .prepare("UPDATE agent_chats SET messages = ?, title = ?, updated_at = datetime('now') WHERE id = ?")
          .run(JSON.stringify(messages), title, id);
        return;
      }

      getDb()
        .prepare(
          "INSERT INTO agent_chats (id, agent_id, title, messages, created_at, updated_at) VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))"
        )
        .run(id, agentId, title, JSON.stringify(messages));
    },
    async getAgentChats(agentId) {
      if (agentId) {
        return getDb()
          .prepare("SELECT * FROM agent_chats WHERE agent_id = ? ORDER BY updated_at DESC")
          .all(agentId) as AgentChatRecord[];
      }

      return getDb().prepare("SELECT * FROM agent_chats ORDER BY updated_at DESC").all() as AgentChatRecord[];
    },
    async getAgentChatById(id) {
      return getDb().prepare("SELECT * FROM agent_chats WHERE id = ?").get(id) as AgentChatRecord | undefined;
    },
    async deleteAgentChat(id) {
      return getDb().prepare("DELETE FROM agent_chats WHERE id = ?").run(id).changes > 0;
    },
  };
}

function createPostgresAdapter(): StorageAdapter {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    throw new Error("Postgres storage requires DATABASE_URL or POSTGRES_URL");
  }

  const globalPool = globalThis as typeof globalThis & { __hypermindPgPool?: Pool };

  async function getPool() {
    if (!globalPool.__hypermindPgPool) {
      const { Pool } = await import("pg");
      globalPool.__hypermindPgPool = new Pool({
        connectionString,
        ssl: process.env.POSTGRES_SSL === "disable" ? false : { rejectUnauthorized: false },
      });
    }

    return globalPool.__hypermindPgPool;
  }

  return {
    provider: "postgres",
    async initialize() {
      const pool = await getPool();
      await pool.query(`
        CREATE TABLE IF NOT EXISTS debates (
          id TEXT PRIMARY KEY,
          topic TEXT NOT NULL,
          agents_output JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_pin TEXT
        )
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_chats (
          id TEXT PRIMARY KEY,
          agent_id TEXT NOT NULL,
          title TEXT NOT NULL,
          messages JSONB NOT NULL DEFAULT '[]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          user_pin TEXT
        )
      `);
      // Add user_pin column if not exists (migration for existing tables)
      await pool.query(`ALTER TABLE debates ADD COLUMN IF NOT EXISTS user_pin TEXT`).catch(() => {});
      await pool.query(`ALTER TABLE agent_chats ADD COLUMN IF NOT EXISTS user_pin TEXT`).catch(() => {});
    },
    async insertDebate(id, topic, agentsOutput, userPin) {
      const pool = await getPool();
      await pool.query(
        "INSERT INTO debates (id, topic, agents_output, created_at, user_pin) VALUES ($1, $2, $3::jsonb, NOW(), $4)",
        [id, topic, JSON.stringify(agentsOutput), userPin || null]
      );
    },
    async getAllDebates(userPin) {
      const pool = await getPool();
      if (userPin) {
        const result = await pool.query(
          "SELECT id, topic, agents_output::text AS agents_output, created_at::text AS created_at, user_pin FROM debates WHERE user_pin = $1 ORDER BY created_at DESC",
          [userPin]
        );
        return result.rows as DebateRecord[];
      }
      const result = await pool.query(
        "SELECT id, topic, agents_output::text AS agents_output, created_at::text AS created_at, user_pin FROM debates ORDER BY created_at DESC"
      );
      return result.rows as DebateRecord[];
    },
    async getDebateById(id) {
      const pool = await getPool();
      const result = await pool.query(
        "SELECT id, topic, agents_output::text AS agents_output, created_at::text AS created_at FROM debates WHERE id = $1",
        [id]
      );
      return result.rows[0] as DebateRecord | undefined;
    },
    async deleteDebate(id) {
      const pool = await getPool();
      const result = await pool.query("DELETE FROM debates WHERE id = $1", [id]);
      return (result.rowCount || 0) > 0;
    },
    async upsertAgentChat(id, agentId, title, messages, userPin) {
      const pool = await getPool();
      await pool.query(
        `
          INSERT INTO agent_chats (id, agent_id, title, messages, created_at, updated_at, user_pin)
          VALUES ($1, $2, $3, $4::jsonb, NOW(), NOW(), $5)
          ON CONFLICT (id)
          DO UPDATE SET
            agent_id = EXCLUDED.agent_id,
            title = EXCLUDED.title,
            messages = EXCLUDED.messages,
            updated_at = NOW()
        `,
        [id, agentId, title, JSON.stringify(messages), userPin || null]
      );
    },
    async getAgentChats(agentId, userPin) {
      const pool = await getPool();
      const cols = "id, agent_id, title, messages::text AS messages, created_at::text AS created_at, updated_at::text AS updated_at, user_pin";
      let result;
      if (agentId && userPin) {
        result = await pool.query(`SELECT ${cols} FROM agent_chats WHERE agent_id = $1 AND user_pin = $2 ORDER BY updated_at DESC`, [agentId, userPin]);
      } else if (agentId) {
        result = await pool.query(`SELECT ${cols} FROM agent_chats WHERE agent_id = $1 ORDER BY updated_at DESC`, [agentId]);
      } else if (userPin) {
        result = await pool.query(`SELECT ${cols} FROM agent_chats WHERE user_pin = $1 ORDER BY updated_at DESC`, [userPin]);
      } else {
        result = await pool.query(`SELECT ${cols} FROM agent_chats ORDER BY updated_at DESC`);
      }
      return result.rows as AgentChatRecord[];
    },
    async getAgentChatById(id) {
      const pool = await getPool();
      const result = await pool.query(
        "SELECT id, agent_id, title, messages::text AS messages, created_at::text AS created_at, updated_at::text AS updated_at FROM agent_chats WHERE id = $1",
        [id]
      );
      return result.rows[0] as AgentChatRecord | undefined;
    },
    async deleteAgentChat(id) {
      const pool = await getPool();
      const result = await pool.query("DELETE FROM agent_chats WHERE id = $1", [id]);
      return (result.rowCount || 0) > 0;
    },
  };
}

export function getStorageProvider() {
  return STORAGE_PROVIDER;
}

export function isStorageConfigured() {
  if (STORAGE_PROVIDER !== "postgres") return true;
  return Boolean(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

export async function insertDebate(id: string, topic: string, agentsOutput: object[], userPin?: string): Promise<void> {
  await ensureInitialized();
  await getStorageAdapter().insertDebate(id, topic, agentsOutput, userPin);
}

export async function getAllDebates(userPin?: string): Promise<DebateRecord[]> {
  await ensureInitialized();
  return getStorageAdapter().getAllDebates(userPin);
}

export async function getDebateById(id: string): Promise<DebateRecord | undefined> {
  await ensureInitialized();
  return getStorageAdapter().getDebateById(id);
}

export async function deleteDebate(id: string): Promise<boolean> {
  await ensureInitialized();
  return getStorageAdapter().deleteDebate(id);
}

export async function upsertAgentChat(id: string, agentId: string, title: string, messages: object[], userPin?: string): Promise<void> {
  await ensureInitialized();
  await getStorageAdapter().upsertAgentChat(id, agentId, title, messages, userPin);
}

export async function getAgentChats(agentId?: string, userPin?: string): Promise<AgentChatRecord[]> {
  await ensureInitialized();
  return getStorageAdapter().getAgentChats(agentId, userPin);
}

export async function getAgentChatById(id: string): Promise<AgentChatRecord | undefined> {
  await ensureInitialized();
  return getStorageAdapter().getAgentChatById(id);
}

export async function deleteAgentChat(id: string): Promise<boolean> {
  await ensureInitialized();
  return getStorageAdapter().deleteAgentChat(id);
}
