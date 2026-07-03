pub mod migrations;
pub mod studios;

use rusqlite::Connection;
use std::sync::Mutex;
use tauri::{AppHandle, Manager};

pub struct AppDb(pub Mutex<Connection>);

pub fn open(app: &AppHandle) -> Result<AppDb, String> {
  let dir = app
    .path()
    .app_data_dir()
    .map_err(|error| error.to_string())?;

  std::fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

  let db_path = dir.join("st-manager.db");
  let connection = Connection::open(db_path).map_err(|error| error.to_string())?;
  migrations::run(&connection)?;

  Ok(AppDb(Mutex::new(connection)))
}
