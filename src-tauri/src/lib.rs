use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};

fn get_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("ClassroomManagement"))
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

fn normalize_for_compare(path: &Path) -> String {
    let mut normalized = path
        .to_string_lossy()
        .replace('\\', "/")
        .to_lowercase();
    if let Some(stripped) = normalized.strip_prefix("//?/") {
        normalized = stripped.to_string();
    }
    while normalized.len() > 1 && normalized.ends_with('/') {
        normalized.pop();
    }
    normalized
}

fn path_is_under(base: &Path, candidate: &Path) -> bool {
    let base_key = normalize_for_compare(base);
    let candidate_key = normalize_for_compare(candidate);
    candidate_key == base_key || candidate_key.starts_with(&format!("{}/", base_key))
}

fn resolve_under_data_path(path: &Path, create_missing_parent: bool) -> Result<PathBuf, String> {
    if path.exists() {
        return std::fs::canonicalize(path)
            .map_err(|e| format!("Failed to canonicalize {}: {}", path.display(), e));
    }

    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid path: {}", path.display()))?;

    if !parent.exists() {
        if !create_missing_parent {
            if path.file_name().is_none() {
                return Err(format!("Path not found: {}", path.display()));
            }
            // Allow checking or removing a not-yet-created file under an existing parent.
            if !parent.as_os_str().is_empty() {
                let canonical_parent = std::fs::canonicalize(parent).map_err(|_| {
                    format!("Path not found: {}", path.display())
                })?;
                return Ok(canonical_parent.join(path.file_name().unwrap()));
            }
            return Err(format!("Path not found: {}", path.display()));
        }
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent dir {}: {}", parent.display(), e))?;
    }

    let canonical_parent = std::fs::canonicalize(parent)
        .map_err(|e| format!("Failed to canonicalize {}: {}", parent.display(), e))?;

    match path.file_name() {
        Some(name) => Ok(canonical_parent.join(name)),
        None => Ok(canonical_parent),
    }
}

fn assert_under_data_dir(app: &AppHandle, path: &str, create_missing_parent: bool) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app)?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir {}: {}", data_dir.display(), e))?;

    let canonical_data = std::fs::canonicalize(&data_dir)
        .map_err(|e| format!("Failed to canonicalize data dir {}: {}", data_dir.display(), e))?;

    let requested = PathBuf::from(path);
    let resolved = resolve_under_data_path(&requested, create_missing_parent)?;

    if !path_is_under(&canonical_data, &resolved) {
        return Err("Access denied: path is outside application data directory".to_string());
    }

    Ok(resolved)
}

#[tauri::command]
async fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let dir = get_data_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
async fn ensure_dir(app: AppHandle, path: String) -> Result<(), String> {
    let safe_path = assert_under_data_dir(&app, &path, true)?;
    std::fs::create_dir_all(&safe_path)
        .map_err(|e| format!("Failed to create dir {}: {}", safe_path.display(), e))
}

#[tauri::command]
async fn read_text_file(app: AppHandle, path: String) -> Result<String, String> {
    let safe_path = assert_under_data_dir(&app, &path, false)?;
    std::fs::read_to_string(&safe_path)
        .map_err(|e| format!("Failed to read {}: {}", safe_path.display(), e))
}

fn atomic_replace_file(temp_path: &Path, dest_path: &Path) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::ffi::OsStrExt;

        let temp_wide: Vec<u16> = temp_path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();
        let dest_wide: Vec<u16> = dest_path
            .as_os_str()
            .encode_wide()
            .chain(std::iter::once(0))
            .collect();

        const MOVEFILE_REPLACE_EXISTING: u32 = 0x0000_0001;
        const MOVEFILE_WRITE_THROUGH: u32 = 0x0000_0008;

        let ok = unsafe {
            windows_sys::Win32::Storage::FileSystem::MoveFileExW(
                temp_wide.as_ptr(),
                dest_wide.as_ptr(),
                MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
            )
        };

        if ok == 0 {
            let code = unsafe { windows_sys::Win32::Foundation::GetLastError() };
            return Err(format!(
                "Failed to replace {} with {} (error code {})",
                dest_path.display(),
                temp_path.display(),
                code
            ));
        }

        return Ok(());
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::fs::rename(temp_path, dest_path).map_err(|e| {
            format!(
                "Failed to rename temp file to {}: {}",
                dest_path.display(),
                e
            )
        })
    }
}

#[tauri::command]
async fn write_binary_file(app: AppHandle, path: String, contents: Vec<u8>) -> Result<(), String> {
    let safe_path = assert_under_data_dir(&app, &path, true)?;
    let temp_path = PathBuf::from(format!("{}.tmp", safe_path.to_string_lossy()));
    let canonical_data = std::fs::canonicalize(get_data_dir(&app)?)
        .map_err(|e| format!("Failed to canonicalize data dir: {}", e))?;
    if !path_is_under(&canonical_data, &temp_path) {
        return Err("Access denied: temp path is outside application data directory".to_string());
    }

    std::fs::write(&temp_path, &contents)
        .map_err(|e| format!("Failed to write temp file {}: {}", temp_path.display(), e))?;

    atomic_replace_file(&temp_path, &safe_path)?;

    Ok(())
}

#[tauri::command]
async fn read_binary_file(app: AppHandle, path: String) -> Result<Vec<u8>, String> {
    let safe_path = assert_under_data_dir(&app, &path, false)?;
    std::fs::read(&safe_path).map_err(|e| format!("Failed to read {}: {}", safe_path.display(), e))
}

#[tauri::command]
async fn remove_dir(app: AppHandle, path: String) -> Result<(), String> {
    let safe_path = match assert_under_data_dir(&app, &path, false) {
        Ok(resolved) => resolved,
        Err(_) => return Ok(()),
    };
    if safe_path.exists() {
        std::fs::remove_dir_all(&safe_path)
            .map_err(|e| format!("Failed to remove dir {}: {}", safe_path.display(), e))?;
    }
    Ok(())
}

#[tauri::command]
async fn rename_path(app: AppHandle, from: String, to: String) -> Result<(), String> {
    let safe_from = assert_under_data_dir(&app, &from, false)?;
    let safe_to_parent = PathBuf::from(&to);
    let safe_to = assert_under_data_dir(&app, &to, true)?;

    if !safe_from.exists() {
        return Ok(());
    }

    if safe_to.exists() {
        return Err(format!("Destination already exists: {}", safe_to.display()));
    }

    if let Some(parent) = safe_to_parent.parent() {
        if !parent.exists() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create parent dir {}: {}", parent.display(), e))?;
        }
    }

    std::fs::rename(&safe_from, &safe_to)
        .map_err(|e| format!("Failed to rename {} to {}: {}", safe_from.display(), safe_to.display(), e))
}

#[tauri::command]
async fn write_text_file(app: AppHandle, path: String, contents: String) -> Result<(), String> {
    let safe_path = assert_under_data_dir(&app, &path, true)?;
    let temp_path = PathBuf::from(format!("{}.tmp", safe_path.to_string_lossy()));
    let canonical_data = std::fs::canonicalize(get_data_dir(&app)?)
        .map_err(|e| format!("Failed to canonicalize data dir: {}", e))?;
    if !path_is_under(&canonical_data, &temp_path) {
        return Err("Access denied: temp path is outside application data directory".to_string());
    }

    std::fs::write(&temp_path, &contents)
        .map_err(|e| format!("Failed to write temp file {}: {}", temp_path.display(), e))?;

    atomic_replace_file(&temp_path, &safe_path)?;

    Ok(())
}

#[tauri::command]
async fn remove_file(app: AppHandle, path: String) -> Result<(), String> {
    let safe_path = match assert_under_data_dir(&app, &path, false) {
        Ok(resolved) => resolved,
        Err(_) => return Ok(()),
    };
    if safe_path.exists() {
        std::fs::remove_file(&safe_path)
            .map_err(|e| format!("Failed to remove {}: {}", safe_path.display(), e))
    } else {
        Ok(())
    }
}

#[tauri::command]
async fn file_exists(app: AppHandle, path: String) -> Result<bool, String> {
    let safe_path = assert_under_data_dir(&app, &path, false)?;
    Ok(safe_path.exists())
}
#[tauri::command]
async fn open_path(app: AppHandle, path: String) -> Result<(), String> {
    let safe_path = assert_under_data_dir(&app, &path, false)?;
    let open_target = safe_path.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&open_target)
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&open_target)
            .spawn()
            .map_err(|e| format!("Failed to open finder: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&open_target)
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
            write_binary_file,
            read_binary_file,
            remove_file,
            remove_dir,
            rename_path,
            file_exists,
            open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
