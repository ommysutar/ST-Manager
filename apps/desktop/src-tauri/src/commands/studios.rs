use tauri::State;

use crate::db::studios::{
  create_local, get_sync_state, build_sync_status, list_all, list_pending, mark_failed, mark_synced,
  merge_pulled, set_sync_state, LocalStudioDto, PulledStudioDto, SyncStatusDto, STUDIOS_LAST_PULLED_AT,
};
use crate::db::AppDb;

#[tauri::command]
pub fn list_local_studios(db: State<'_, AppDb>) -> Result<Vec<LocalStudioDto>, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  list_all(&connection)
}

#[tauri::command]
pub fn create_local_studio(db: State<'_, AppDb>, name: String) -> Result<LocalStudioDto, String> {
  let trimmed = name.trim();
  if trimmed.is_empty() {
    return Err("Studio name is required".to_string());
  }
  if trimmed.len() > 120 {
    return Err("Studio name must be at most 120 characters".to_string());
  }

  let connection = db.0.lock().map_err(|error| error.to_string())?;
  create_local(&connection, trimmed)
}

#[tauri::command]
pub fn list_pending_studios(db: State<'_, AppDb>) -> Result<Vec<LocalStudioDto>, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  list_pending(&connection)
}

#[tauri::command]
pub fn mark_studios_synced(db: State<'_, AppDb>, ids: Vec<String>) -> Result<(), String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  mark_synced(&connection, &ids)
}

#[tauri::command]
pub fn mark_studio_sync_failed(
  db: State<'_, AppDb>,
  id: String,
  error: String,
) -> Result<(), String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  mark_failed(&connection, &id, &error)
}

#[tauri::command]
pub fn merge_pulled_studios(
  db: State<'_, AppDb>,
  studios: Vec<PulledStudioDto>,
) -> Result<u32, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  merge_pulled(&connection, &studios)
}

#[tauri::command]
pub fn get_sync_state_value(db: State<'_, AppDb>, key: String) -> Result<Option<String>, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  get_sync_state(&connection, &key)
}

#[tauri::command]
pub fn set_sync_state_value(db: State<'_, AppDb>, key: String, value: String) -> Result<(), String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  set_sync_state(&connection, &key, &value)
}

#[tauri::command]
pub fn get_sync_status(db: State<'_, AppDb>) -> Result<SyncStatusDto, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  build_sync_status(&connection)
}

#[tauri::command]
pub fn get_studios_last_pulled_at(db: State<'_, AppDb>) -> Result<Option<String>, String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  get_sync_state(&connection, STUDIOS_LAST_PULLED_AT)
}

#[tauri::command]
pub fn set_studios_last_pulled_at(db: State<'_, AppDb>, value: String) -> Result<(), String> {
  let connection = db.0.lock().map_err(|error| error.to_string())?;
  set_sync_state(&connection, STUDIOS_LAST_PULLED_AT, &value)
}
