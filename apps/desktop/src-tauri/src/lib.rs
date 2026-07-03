mod commands;
mod db;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      let database = db::open(app.handle())?;
      app.manage(database);

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      commands::studios::list_local_studios,
      commands::studios::create_local_studio,
      commands::studios::list_pending_studios,
      commands::studios::mark_studios_synced,
      commands::studios::mark_studio_sync_failed,
      commands::studios::merge_pulled_studios,
      commands::studios::get_sync_state_value,
      commands::studios::set_sync_state_value,
      commands::studios::get_sync_status,
      commands::studios::get_studios_last_pulled_at,
      commands::studios::set_studios_last_pulled_at,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
