use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};

fn get_data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_data_dir()
        .map(|p| p.join("ClassroomManagement"))
        .map_err(|e| format!("Failed to get app data dir: {}", e))
}

fn path_has_forbidden_components(path: &Path) -> bool {
    for component in path.components() {
        match component {
            Component::ParentDir => return true,
            Component::Normal(s) if s.is_empty() => return true,
            _ => {}
        }
    }
    false
}

fn path_is_under(base: &Path, candidate: &Path) -> bool {
    candidate.starts_with(base)
}

fn resolve_under_data_path(
    path: &Path,
    canonical_data: &Path,
    create_missing_parent: bool,
) -> Result<PathBuf, String> {
    if path_has_forbidden_components(path) {
        return Err("Access denied: invalid path components".to_string());
    }

    if path.exists() {
        let resolved = std::fs::canonicalize(path)
            .map_err(|e| format!("Failed to canonicalize {}: {}", path.display(), e))?;
        if !path_is_under(canonical_data, &resolved) {
            return Err("Access denied: path is outside application data directory".to_string());
        }
        return Ok(resolved);
    }

    let parent = path
        .parent()
        .ok_or_else(|| format!("Invalid path: {}", path.display()))?;

    let resolved_parent = if parent.as_os_str().is_empty() {
        canonical_data.to_path_buf()
    } else if parent.exists() {
        let canonical_parent = std::fs::canonicalize(parent)
            .map_err(|e| format!("Failed to canonicalize {}: {}", parent.display(), e))?;
        if !path_is_under(canonical_data, &canonical_parent) {
            return Err("Access denied: path is outside application data directory".to_string());
        }
        canonical_parent
    } else if !create_missing_parent {
        if path.file_name().is_none() {
            return Err(format!("Path not found: {}", path.display()));
        }
        if !parent.as_os_str().is_empty() {
            let canonical_parent = std::fs::canonicalize(parent).map_err(|_| {
                format!("Path not found: {}", path.display())
            })?;
            if !path_is_under(canonical_data, &canonical_parent) {
                return Err("Access denied: path is outside application data directory".to_string());
            }
            let resolved = canonical_parent.join(path.file_name().unwrap());
            if !path_is_under(canonical_data, &resolved) {
                return Err("Access denied: path is outside application data directory".to_string());
            }
            return Ok(resolved);
        }
        return Err(format!("Path not found: {}", path.display()));
    } else {
        let joined = if path.is_absolute() {
            parent.to_path_buf()
        } else {
            canonical_data.join(parent)
        };
        if path_has_forbidden_components(&joined) {
            return Err("Access denied: invalid path components".to_string());
        }
        if joined.exists() {
            let canonical_parent = std::fs::canonicalize(&joined)
                .map_err(|e| format!("Failed to canonicalize {}: {}", joined.display(), e))?;
            if !path_is_under(canonical_data, &canonical_parent) {
                return Err("Access denied: path is outside application data directory".to_string());
            }
            canonical_parent
        } else {
            if !path_is_under(canonical_data, &joined) {
                return Err("Access denied: path is outside application data directory".to_string());
            }
            joined
        }
    };

    let resolved = match path.file_name() {
        Some(name) => resolved_parent.join(name),
        None => resolved_parent.clone(),
    };

    if !path_is_under(canonical_data, &resolved) {
        return Err("Access denied: path is outside application data directory".to_string());
    }

    if create_missing_parent {
        if let Some(parent_dir) = resolved.parent() {
            std::fs::create_dir_all(parent_dir).map_err(|e| {
                format!("Failed to create parent dir {}: {}", parent_dir.display(), e)
            })?;
        }
    }

    Ok(resolved)
}

fn assert_under_data_dir(
    app: &AppHandle,
    path: &str,
    create_missing_parent: bool,
) -> Result<PathBuf, String> {
    let data_dir = get_data_dir(app)?;
    std::fs::create_dir_all(&data_dir)
        .map_err(|e| format!("Failed to create data dir {}: {}", data_dir.display(), e))?;

    let canonical_data = std::fs::canonicalize(&data_dir)
        .map_err(|e| format!("Failed to canonicalize data dir {}: {}", data_dir.display(), e))?;

    let requested = PathBuf::from(path);
    if path_has_forbidden_components(&requested) {
        return Err("Access denied: invalid path components".to_string());
    }

    let under_data = if requested.is_absolute() {
        requested
    } else {
        canonical_data.join(&requested)
    };

    resolve_under_data_path(&under_data, &canonical_data, create_missing_parent)
}

#[tauri::command]
async fn get_data_directory(app: AppHandle) -> Result<String, String> {
    let dir = get_data_dir(&app)?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_cloud_backup_token() -> Option<String> {
    std::env::var("CLOUD_BACKUP_TOKEN")
        .ok()
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}

const ENTITLEMENT_SERVICE: &str = "education-management";
const ENTITLEMENT_USER: &str = "teacher-entitlement";

#[tauri::command]
fn save_entitlement(app: AppHandle, payload: String) -> Result<(), String> {
  let entry = keyring::Entry::new(ENTITLEMENT_SERVICE, ENTITLEMENT_USER)
    .map_err(|e| format!("Failed to access secure storage: {}", e))?;
  entry
    .set_password(&payload)
    .map_err(|e| format!("Failed to save entitlement to secure storage: {}", e))?;

  // Keep an app-data backup so reopen still works if the OS keychain read fails later.
  let data_dir = get_data_dir(&app)?;
  let path = data_dir.join("entitlement.sec");
  std::fs::write(&path, &payload)
    .map_err(|e| format!("Failed to write entitlement backup: {}", e))?;

  Ok(())
}

#[tauri::command]
fn load_entitlement(app: AppHandle) -> Result<Option<String>, String> {
  // Prefer keyring. If empty, migrate entitlement.sec into keyring and delete the file.
  // Fail closed: if keyring set fails, do not return plaintext from the file.
  if let Ok(entry) = keyring::Entry::new(ENTITLEMENT_SERVICE, ENTITLEMENT_USER) {
    if let Ok(value) = entry.get_password() {
      if !value.trim().is_empty() {
        return Ok(Some(value));
      }
    }
  }

  let data_dir = get_data_dir(&app)?;
  let path = data_dir.join("entitlement.sec");
  if !path.exists() {
    return Ok(None);
  }

  let legacy = std::fs::read_to_string(&path)
    .map_err(|e| format!("Failed to read entitlement: {}", e))?;
  if legacy.trim().is_empty() {
    return Ok(None);
  }

  let entry = keyring::Entry::new(ENTITLEMENT_SERVICE, ENTITLEMENT_USER)
    .map_err(|e| format!("Failed to access secure storage: {}", e))?;
  entry
    .set_password(&legacy)
    .map_err(|e| format!("Failed to migrate entitlement to secure storage: {}", e))?;

  let _ = std::fs::remove_file(&path);
  Ok(Some(legacy))
}

#[tauri::command]
fn clear_entitlement(app: AppHandle) -> Result<(), String> {
  if let Ok(entry) = keyring::Entry::new(ENTITLEMENT_SERVICE, ENTITLEMENT_USER) {
    let _ = entry.delete_credential();
  }
  let data_dir = get_data_dir(&app)?;
  let path = data_dir.join("entitlement.sec");
  if path.exists() {
    let _ = std::fs::remove_file(&path);
  }
  Ok(())
}

fn open_system_url(url: &str) -> Result<(), String> {
  #[cfg(target_os = "windows")]
  {
    // `cmd /C start` parses `&` in the URL as a command separator unless the URL is quoted,
    // which drops OAuth params (e.g. response_type) and triggers Google 400 invalid_request.
    std::process::Command::new("rundll32")
      .args(["url.dll,FileProtocolHandler", url])
      .spawn()
      .map_err(|e| format!("Failed to open browser: {}", e))?;
  }
  #[cfg(target_os = "macos")]
  {
    std::process::Command::new("open")
      .arg(url)
      .spawn()
      .map_err(|e| format!("Failed to open browser: {}", e))?;
  }
  #[cfg(target_os = "linux")]
  {
    std::process::Command::new("xdg-open")
      .arg(url)
      .spawn()
      .map_err(|e| format!("Failed to open browser: {}", e))?;
  }
  Ok(())
}

#[derive(serde::Serialize)]
struct GoogleOAuthCallback {
  code: String,
  redirect_uri: String,
}

fn extract_oauth_code(path: &str) -> Option<String> {
  if !path.starts_with("/oauth/callback") {
    return None;
  }

  let query = path.split('?').nth(1)?;
  for pair in query.split('&') {
    let (key, value) = pair.split_once('=')?;
    if key == "code" {
      return urlencoding::decode(value)
        .map(|decoded| decoded.into_owned())
        .ok();
    }
  }

  None
}

fn write_http_response(stream: &mut std::net::TcpStream, status: &str, body: &str) {
  use std::io::Write;
  let response = format!(
    "HTTP/1.1 {}\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
    status,
    body.len(),
    body
  );
  let _ = stream.write_all(response.as_bytes());
  let _ = stream.flush();
}

fn focus_app_window(app: &AppHandle) {
  #[cfg(target_os = "windows")]
  {
    use windows_sys::Win32::UI::WindowsAndMessaging::{AllowSetForegroundWindow, ASFW_ANY};
    unsafe {
      AllowSetForegroundWindow(ASFW_ANY);
    }
  }

  for (_, window) in app.webview_windows() {
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    break;
  }
}

#[tauri::command]
async fn start_google_oauth(
  app: AppHandle,
  client_id: String,
  code_challenge: String,
) -> Result<GoogleOAuthCallback, String> {
  use std::io::Read;
  use std::net::TcpListener;
  use std::time::{Duration, Instant};

  let listener = TcpListener::bind("127.0.0.1:0")
    .map_err(|e| format!("Failed to bind loopback port: {}", e))?;
  let port = listener
    .local_addr()
    .map_err(|e| format!("Failed to read local addr: {}", e))?
    .port();
  let redirect_uri = format!("http://127.0.0.1:{port}/oauth/callback");
  let auth_url = format!(
    "https://accounts.google.com/o/oauth2/v2/auth?client_id={}&redirect_uri={}&response_type=code&scope=openid%20email%20profile&code_challenge={}&code_challenge_method=S256&access_type=offline&prompt=consent",
    urlencoding::encode(&client_id),
    urlencoding::encode(&redirect_uri),
    urlencoding::encode(&code_challenge),
  );

  open_system_url(&auth_url)?;

  listener
    .set_nonblocking(true)
    .map_err(|e| format!("Failed to configure listener: {}", e))?;

  let started = Instant::now();
  loop {
    if started.elapsed() > Duration::from_secs(180) {
      return Err("Google sign-in timed out".to_string());
    }

    if let Ok((mut stream, _)) = listener.accept() {
      let mut buffer = [0u8; 8192];
      let read = stream
        .read(&mut buffer)
        .map_err(|e| format!("Failed to read OAuth callback: {}", e))?;
      let request = String::from_utf8_lossy(&buffer[..read]);
      let request_line = request.lines().next().unwrap_or("");
      let path = request_line
        .split_whitespace()
        .nth(1)
        .unwrap_or("/");

      if let Some(code) = extract_oauth_code(path) {
        write_http_response(
          &mut stream,
          "200 OK",
          "Đăng nhập thành công. Ứng dụng sẽ được đưa lên trước.",
        );
        focus_app_window(&app);
        return Ok(GoogleOAuthCallback {
          code,
          redirect_uri,
        });
      }

      write_http_response(&mut stream, "404 Not Found", "Not found");
    }

    std::thread::sleep(Duration::from_millis(50));
  }
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
    let canonical_temp = if temp_path.exists() {
        std::fs::canonicalize(&temp_path)
            .map_err(|e| format!("Failed to canonicalize temp path: {}", e))?
    } else {
        temp_path.clone()
    };
    if !path_is_under(&canonical_data, &canonical_temp) {
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
    let safe_to = assert_under_data_dir(&app, &to, true)?;

    if !safe_from.exists() {
        return Ok(());
    }

    if safe_to.exists() {
        return Err(format!("Destination already exists: {}", safe_to.display()));
    }

    if let Some(parent) = safe_to.parent() {
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
    let canonical_temp = if temp_path.exists() {
        std::fs::canonicalize(&temp_path)
            .map_err(|e| format!("Failed to canonicalize temp path: {}", e))?
    } else {
        temp_path.clone()
    };
    if !path_is_under(&canonical_data, &canonical_temp) {
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
async fn list_dir(app: AppHandle, path: String) -> Result<Vec<String>, String> {
    let safe_path = assert_under_data_dir(&app, &path, false)?;
    if !safe_path.is_dir() {
        return Ok(vec![]);
    }

    let mut names = Vec::new();
    for entry in std::fs::read_dir(&safe_path)
        .map_err(|e| format!("Failed to list {}: {}", safe_path.display(), e))?
    {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {}", e))?;
        names.push(entry.file_name().to_string_lossy().to_string());
    }
    names.sort();
    Ok(names)
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
            get_cloud_backup_token,
            save_entitlement,
            load_entitlement,
            clear_entitlement,
            start_google_oauth,
            ensure_dir,
            read_text_file,
            write_text_file,
            write_binary_file,
            read_binary_file,
            remove_file,
            remove_dir,
            rename_path,
            file_exists,
            list_dir,
            open_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod path_tests {
    // Entitlement keyring migrate/fail-closed (`load_entitlement`) is not covered here:
    // these tests have no keyring crate fixture. Fail-closed means: if `entitlement.sec`
    // exists and `keyring::Entry::set_password` fails, do not return the file contents.
    use super::*;
    use std::fs;
    use std::sync::{Mutex, OnceLock};

    fn test_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn with_temp_data_dir<F: FnOnce(&Path)>(test: F) {
        let _guard = test_lock().lock().expect("test lock poisoned");
        let base = std::env::temp_dir().join(format!(
            "classroom_mgmt_path_test_{}",
            std::process::id()
        ));
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).expect("create temp data dir");
        test(&base);
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn rejects_parent_dir_components() {
        assert!(path_has_forbidden_components(Path::new("../secret")));
        assert!(path_has_forbidden_components(Path::new("classrooms/../../etc/passwd")));
    }

    #[test]
    fn allows_absolute_paths_under_data_dir() {
        with_temp_data_dir(|data_dir| {
            let canonical_data = fs::canonicalize(data_dir).expect("canonicalize data dir");
            let classrooms = data_dir.join("classrooms");
            fs::create_dir_all(&classrooms).expect("create classrooms dir");

            let absolute = classrooms.join("Lop-2-7.json");
            let resolved =
                resolve_under_data_path(&absolute, &canonical_data, true).expect("resolve in-root absolute path");
            assert!(path_is_under(&canonical_data, &resolved));
        });
    }

    #[test]
    fn denies_absolute_paths_outside_data_dir() {
        with_temp_data_dir(|data_dir| {
            let canonical_data = fs::canonicalize(data_dir).expect("canonicalize data dir");
            let outside = std::env::temp_dir().join("classroom_mgmt_outside");
            let _ = fs::remove_dir_all(&outside);
            fs::create_dir_all(&outside).expect("create outside dir");

            let err = resolve_under_data_path(&outside, &canonical_data, false)
                .expect_err("outside path must be denied");
            assert!(err.contains("outside application data directory"));

            let _ = fs::remove_dir_all(&outside);
        });
    }

    #[test]
    fn denies_parent_dir_traversal() {
        with_temp_data_dir(|data_dir| {
            let canonical_data = fs::canonicalize(data_dir).expect("canonicalize data dir");
            let traversal = data_dir.join("classrooms").join("..").join("..").join("secret.txt");
            let err = resolve_under_data_path(&traversal, &canonical_data, false)
                .expect_err("parent traversal must be denied");
            assert!(err.contains("invalid path components") || err.contains("outside application data directory"));
        });
    }
}
