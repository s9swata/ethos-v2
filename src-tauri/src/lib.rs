use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;

struct SidecarState(Mutex<Option<CommandChild>>);

fn wait_for_server(port: u16) -> Result<(), String> {
    let addr = format!("127.0.0.1:{}", port);
    for _ in 0..150 {
        if std::net::TcpStream::connect(&addr).is_ok() {
            return Ok(());
        }
        std::thread::sleep(std::time::Duration::from_millis(500));
    }
    Err(format!("Sidecar failed to start on port {} after 75s", port))
}

#[tauri::command]
fn start_sidecar(app: tauri::AppHandle) -> Result<u16, String> {
    // Fixed high port — avoids TOCTOU race in dynamic allocation.
    let port = 53241u16;

    println!("[ethos] Starting sidecar on 127.0.0.1:{}", port);

    let (_rx, child) = app
        .shell()
        .sidecar("sidecar")
        .map_err(|e| e.to_string())?
        .args([port.to_string()])
        .spawn()
        .map_err(|e| {
            let msg = format!("Failed to spawn sidecar: {}", e);
            eprintln!("[ethos] {}", msg);
            msg
        })?;

    *app.state::<SidecarState>().0.lock().unwrap() = Some(child);
    wait_for_server(port)?;
    println!("[ethos] Sidecar ready on 127.0.0.1:{}", port);
    Ok(port)
}

#[tauri::command]
fn stop_sidecar(app: tauri::AppHandle) -> Result<(), String> {
    if let Some(child) = app.state::<SidecarState>().0.lock().unwrap().take() {
        child.kill().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .manage(SidecarState(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![start_sidecar, stop_sidecar])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(child) = window
                    .app_handle()
                    .state::<SidecarState>()
                    .0
                    .lock()
                    .unwrap()
                    .take()
                {
                    let _ = child.kill();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
