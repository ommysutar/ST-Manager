use rusqlite::Connection;

const MIGRATION_V1: &str = "
CREATE TABLE IF NOT EXISTS studios (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL,
  last_sync_error TEXT
);

CREATE TABLE IF NOT EXISTS sync_state (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
";

pub fn run(connection: &Connection) -> Result<(), String> {
  let version: i64 = connection
    .pragma_query_value(None, "user_version", |row| row.get(0))
    .map_err(|error| error.to_string())?;

  if version < 1 {
    connection
      .execute_batch(MIGRATION_V1)
      .map_err(|error| error.to_string())?;
    connection
      .pragma_update(None, "user_version", 1)
      .map_err(|error| error.to_string())?;
  }

  Ok(())
}
