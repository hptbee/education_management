use std::path::PathBuf;
use tauri::{AppHandle, Manager};

fn get_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("ClassroomManagement"))
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

#[tauri::command]
async fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let dir = get_data_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn ensure_dir(path: String) -> Result<(), String> {
    std::fs::create_dir_all(&path).map_err(|e| format!("Failed to create dir {}: {}", path, e))
}

#[tauri::command]
async fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))
}

#[tauri::command]
async fn write_text_file(path: String, contents: String) -> Result<(), String> {
    // Safe write: write to temp file then rename
    let temp_path = format!("{}.tmp", path);
    std::fs::write(&temp_path, &contents)
        .map_err(|e| format!("Failed to write temp file {}: {}", temp_path, e))?;
    std::fs::rename(&temp_path, &path)
        .map_err(|e| format!("Failed to rename temp file to {}: {}", path, e))
}

#[tauri::command]
async fn remove_file(path: String) -> Result<(), String> {
    if std::path::Path::new(&path).exists() {
        std::fs::remove_file(&path).map_err(|e| format!("Failed to remove {}: {}", path, e))
    } else {
        Ok(())
    }
}

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    Ok(std::path::Path::new(&path).exists())
}

#[tauri::command]
async fn open_path(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file manager: {}", e))?;
    }
    Ok(())
}

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_data_directory,
            ensure_dir,
            read_text_file,
            write_text_file,
            remove_file,
            file_exists,
            open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
