CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'agent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE submissions (
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
