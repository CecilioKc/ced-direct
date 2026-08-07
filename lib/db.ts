import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'ced.db');

// ensure data directory exists
import fs from 'fs';
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'agent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id INTEGER NOT NULL,
    submission_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    city_county TEXT,
    phone TEXT,
    race TEXT,
    age_group TEXT,
    sex TEXT,
    contact_method TEXT,
    wants_info TEXT,
    allow_followup TEXT,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
  );
`);

// seed default agents if none exist
const agentCount = db.prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };

if (agentCount.count === 0) {
  const bcrypt = require('bcryptjs');
  const defaultPassword = bcrypt.hashSync('agent123', 10);
  const managerPassword = bcrypt.hashSync('manager123', 10);

  const insert = db.prepare(`
    INSERT INTO agents (name, code, password_hash, role) VALUES (?, ?, ?, ?)
  `);

  insert.run('Agent A', 'AGENT-A', defaultPassword, 'agent');
  insert.run('Agent B', 'AGENT-B', defaultPassword, 'agent');
  insert.run('Agent C', 'AGENT-C', defaultPassword, 'agent');
  insert.run('Manager', 'MANAGER', managerPassword, 'manager');
}

export default db;