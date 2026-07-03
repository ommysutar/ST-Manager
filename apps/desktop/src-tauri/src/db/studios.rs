use chrono::Utc;
use cuid2::create_id;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};

pub const SYNC_PENDING: &str = "pending";
pub const SYNC_SYNCED: &str = "synced";
pub const SYNC_FAILED: &str = "failed";

pub const STUDIOS_LAST_PULLED_AT: &str = "studios_last_pulled_at";

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalStudioDto {
  pub id: String,
  pub name: String,
  pub created_at: String,
  pub updated_at: String,
  pub sync_status: String,
  pub last_sync_error: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PulledStudioDto {
  pub id: String,
  pub name: String,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncStatusDto {
  pub pending_count: u32,
  pub last_pulled_at: Option<String>,
  pub is_online_hint: bool,
}

fn map_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<LocalStudioDto> {
  Ok(LocalStudioDto {
    id: row.get(0)?,
    name: row.get(1)?,
    created_at: row.get(2)?,
    updated_at: row.get(3)?,
    sync_status: row.get(4)?,
    last_sync_error: row.get(5)?,
  })
}

pub fn list_all(connection: &Connection) -> Result<Vec<LocalStudioDto>, String> {
  let mut statement = connection
    .prepare(
      "SELECT id, name, created_at, updated_at, sync_status, last_sync_error
       FROM studios
       ORDER BY datetime(created_at) DESC",
    )
    .map_err(|error| error.to_string())?;

  let rows = statement
    .query_map([], map_row)
    .map_err(|error| error.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())?;

  Ok(rows)
}

pub fn list_pending(connection: &Connection) -> Result<Vec<LocalStudioDto>, String> {
  let mut statement = connection
    .prepare(
      "SELECT id, name, created_at, updated_at, sync_status, last_sync_error
       FROM studios
       WHERE sync_status = ?
       ORDER BY datetime(created_at) ASC",
    )
    .map_err(|error| error.to_string())?;

  let rows = statement
    .query_map([SYNC_PENDING], map_row)
    .map_err(|error| error.to_string())?
    .collect::<Result<Vec<_>, _>>()
    .map_err(|error| error.to_string())?;

  Ok(rows)
}

pub fn create_local(connection: &Connection, name: &str) -> Result<LocalStudioDto, String> {
  let id = create_id();
  let now = Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true);

  connection
    .execute(
      "INSERT INTO studios (id, name, created_at, updated_at, sync_status, last_sync_error)
       VALUES (?1, ?2, ?3, ?4, ?5, NULL)",
      params![id, name, now, now, SYNC_PENDING],
    )
    .map_err(|error| error.to_string())?;

  Ok(LocalStudioDto {
    id,
    name: name.to_string(),
    created_at: now.clone(),
    updated_at: now,
    sync_status: SYNC_PENDING.to_string(),
    last_sync_error: None,
  })
}

pub fn mark_synced(connection: &Connection, ids: &[String]) -> Result<(), String> {
  for id in ids {
    connection
      .execute(
        "UPDATE studios SET sync_status = ?, last_sync_error = NULL WHERE id = ?1",
        params![SYNC_SYNCED, id],
      )
      .map_err(|error| error.to_string())?;
  }

  Ok(())
}

pub fn mark_failed(connection: &Connection, id: &str, error_message: &str) -> Result<(), String> {
  connection
    .execute(
      "UPDATE studios SET sync_status = ?1, last_sync_error = ?2 WHERE id = ?3",
      params![SYNC_FAILED, error_message, id],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

pub fn merge_pulled(connection: &Connection, studios: &[PulledStudioDto]) -> Result<u32, String> {
  let mut merged = 0u32;

  for studio in studios {
    let existing: Option<(String, String)> = connection
      .query_row(
        "SELECT sync_status, updated_at FROM studios WHERE id = ?1",
        params![studio.id],
        |row| Ok((row.get(0)?, row.get(1)?)),
      )
      .optional()
      .map_err(|error| error.to_string())?;

    match existing {
      None => {
        connection
          .execute(
            "INSERT INTO studios (id, name, created_at, updated_at, sync_status, last_sync_error)
             VALUES (?1, ?2, ?3, ?4, ?5, NULL)",
            params![
              studio.id,
              studio.name,
              studio.created_at,
              studio.updated_at,
              SYNC_SYNCED
            ],
          )
          .map_err(|error| error.to_string())?;
        merged += 1;
      }
      Some((sync_status, _local_updated_at)) if sync_status == SYNC_PENDING => {
        continue;
      }
      Some((_, local_updated_at)) => {
        let local_ms = parse_iso(&local_updated_at)?;
        let server_ms = parse_iso(&studio.updated_at)?;

        if server_ms > local_ms {
          connection
            .execute(
              "UPDATE studios
               SET name = ?2, created_at = ?3, updated_at = ?4, sync_status = ?5, last_sync_error = NULL
               WHERE id = ?1",
              params![
                studio.id,
                studio.name,
                studio.created_at,
                studio.updated_at,
                SYNC_SYNCED
              ],
            )
            .map_err(|error| error.to_string())?;
          merged += 1;
        }
      }
    }
  }

  Ok(merged)
}

pub fn get_sync_state(connection: &Connection, key: &str) -> Result<Option<String>, String> {
  connection
    .query_row(
      "SELECT value FROM sync_state WHERE key = ?1",
      params![key],
      |row| row.get(0),
    )
    .optional()
    .map_err(|error| error.to_string())
}

pub fn set_sync_state(connection: &Connection, key: &str, value: &str) -> Result<(), String> {
  connection
    .execute(
      "INSERT INTO sync_state (key, value) VALUES (?1, ?2)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      params![key, value],
    )
    .map_err(|error| error.to_string())?;

  Ok(())
}

pub fn count_pending(connection: &Connection) -> Result<u32, String> {
  let count: i64 = connection
    .query_row(
      "SELECT COUNT(*) FROM studios WHERE sync_status = ?1",
      params![SYNC_PENDING],
      |row| row.get(0),
    )
    .map_err(|error| error.to_string())?;

  Ok(count as u32)
}

pub fn build_sync_status(connection: &Connection) -> Result<SyncStatusDto, String> {
  Ok(SyncStatusDto {
    pending_count: count_pending(connection)?,
    last_pulled_at: get_sync_state(connection, STUDIOS_LAST_PULLED_AT)?,
    is_online_hint: true,
  })
}

fn parse_iso(value: &str) -> Result<i64, String> {
  chrono::DateTime::parse_from_rfc3339(value)
    .map(|date| date.timestamp_millis())
    .map_err(|error| error.to_string())
}
