import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

async function ensureAppStateTable() {
  const { DB } = getRuntimeBindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS app_state (
      owner_email text PRIMARY KEY NOT NULL,
      data_json text NOT NULL,
      updated_at text NOT NULL
    )`),
    DB.prepare("CREATE INDEX IF NOT EXISTS app_state_updated_idx ON app_state (updated_at)"),
  ]);
}

export async function readAppState(ownerEmail: string) {
  await ensureAppStateTable();
  const { DB } = getRuntimeBindings();
  const row = await DB.prepare("SELECT data_json, updated_at FROM app_state WHERE owner_email = ?")
    .bind(ownerEmail)
    .first<{ data_json: string; updated_at: string }>();
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data_json) as unknown, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function writeAppState(ownerEmail: string, data: unknown) {
  await ensureAppStateTable();
  const { DB } = getRuntimeBindings();
  const json = JSON.stringify(data);
  if (json.length > 2_000_000) throw new Error("Os dados estruturados excederam o limite seguro.");
  const updatedAt = new Date().toISOString();
  await DB.prepare(
    `INSERT INTO app_state (owner_email, data_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(owner_email) DO UPDATE SET data_json = excluded.data_json, updated_at = excluded.updated_at`,
  )
    .bind(ownerEmail, json, updatedAt)
    .run();
  return { updatedAt };
}
