import Database from "better-sqlite3";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";

const dataDir = process.env.DATA_DIR
  ? resolve(process.env.DATA_DIR)
  : resolve(process.cwd(), "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const dbPath = resolve(dataDir, "gp-bot.db");
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_date TEXT UNIQUE NOT NULL,
    ask_sent_at TEXT,
    posted_at TEXT,
    participant_ids TEXT
  );

  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    answers_json TEXT NOT NULL,
    replied_at TEXT NOT NULL,
    UNIQUE(round_id, user_id),
    FOREIGN KEY (round_id) REFERENCES rounds(id)
  );

  CREATE INDEX IF NOT EXISTS idx_responses_round ON responses(round_id);
  CREATE INDEX IF NOT EXISTS idx_rounds_date ON rounds(round_date);
`);

export const getRoundByDate = db.prepare(
  "SELECT * FROM rounds WHERE round_date = ?"
);
export const getRoundById = db.prepare("SELECT * FROM rounds WHERE id = ?");
export const createRound = db.prepare(
  "INSERT INTO rounds (round_date, ask_sent_at, participant_ids) VALUES (?, ?, ?)"
);
export const updateRoundPosted = db.prepare(
  "UPDATE rounds SET posted_at = ? WHERE id = ?"
);
export const upsertResponse = db.prepare(`
  INSERT INTO responses (round_id, user_id, answers_json, replied_at)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(round_id, user_id) DO UPDATE SET
    answers_json = excluded.answers_json,
    replied_at = excluded.replied_at
`);
export const getResponsesForRound = db.prepare(
  "SELECT * FROM responses WHERE round_id = ?"
);
export const getUnpostedRounds = db.prepare(
  "SELECT * FROM rounds WHERE posted_at IS NULL ORDER BY round_date ASC"
);
export const getLatestRound = db.prepare(
  "SELECT * FROM rounds ORDER BY round_date DESC LIMIT 1"
);

export const deleteRoundByDate = db.prepare("DELETE FROM rounds WHERE round_date = ?");
export const deleteResponsesForRound = db.prepare("DELETE FROM responses WHERE round_id = ?");

export function deleteRoundAndResponses(roundDate) {
  const round = getRoundByDate.get(roundDate);
  if (round) {
    deleteResponsesForRound.run(round.id);
    deleteRoundByDate.run(roundDate);
  }
}

export default db;
