import { defaultProfessionalSettings } from "@/config/settings";
import { getRuntimeBindings } from "@/lib/server/runtime-bindings";

async function ensureProfessionalSettingsTable() {
  const { DB } = getRuntimeBindings();
  await DB.batch([
    DB.prepare(`CREATE TABLE IF NOT EXISTS professional_settings (
      owner_email text PRIMARY KEY NOT NULL,
      data_json text NOT NULL,
      updated_at text NOT NULL
    )`),
    DB.prepare(
      "CREATE INDEX IF NOT EXISTS professional_settings_updated_idx ON professional_settings (updated_at)",
    ),
  ]);
}

export async function readProfessionalSettings(ownerEmail: string) {
  await ensureProfessionalSettingsTable();
  const { DB } = getRuntimeBindings();
  const row = await DB.prepare(
    "SELECT data_json, updated_at FROM professional_settings WHERE owner_email = ?",
  )
    .bind(ownerEmail)
    .first<{ data_json: string; updated_at: string }>();
  if (!row) return null;
  try {
    return { data: JSON.parse(row.data_json) as unknown, updatedAt: row.updated_at };
  } catch {
    return null;
  }
}

export async function professionalDisplayName(ownerEmail: string, fallback: string) {
  const stored = await readProfessionalSettings(ownerEmail);
  const profile =
    stored?.data && typeof stored.data === "object"
      ? (stored.data as { profile?: { name?: unknown } }).profile
      : undefined;
  const savedName = typeof profile?.name === "string" ? profile.name.trim() : "";
  const defaultName = defaultProfessionalSettings.profile.name.trim();
  return (savedName || defaultName || fallback.trim() || "Profissional").slice(0, 120);
}

export async function writeProfessionalSettings(ownerEmail: string, data: unknown) {
  await ensureProfessionalSettingsTable();
  const { DB } = getRuntimeBindings();
  const json = JSON.stringify(data);
  if (json.length > 500_000) throw new Error("As configurações excederam o limite seguro.");
  const updatedAt = new Date().toISOString();
  await DB.prepare(
    `INSERT INTO professional_settings (owner_email, data_json, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(owner_email) DO UPDATE SET
       data_json = excluded.data_json,
       updated_at = excluded.updated_at`,
  )
    .bind(ownerEmail, json, updatedAt)
    .run();
  return { updatedAt };
}
