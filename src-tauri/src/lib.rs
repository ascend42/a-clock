use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Run an AppleScript snippet (used to invoke `pmset` with admin rights, which
/// prompts the user for authorization the first time / when the wake changes).
fn run_osascript(applescript: &str) -> Result<(), String> {
    let status = std::process::Command::new("/usr/bin/osascript")
        .arg("-e")
        .arg(applescript)
        .status()
        .map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("osascript/pmset failed".into())
    }
}

/// Schedule a macOS wake at `datetime` ("MM/dd/yy HH:mm:ss"), first cancelling
/// the `previous` wake we scheduled (if any) so old events don't pile up.
#[tauri::command]
fn schedule_wake(datetime: String, previous: Option<String>) -> Result<(), String> {
    let mut cmd = String::new();
    if let Some(prev) = previous.filter(|p| !p.is_empty()) {
        cmd.push_str(&format!("/usr/bin/pmset schedule cancel wake \\\"{prev}\\\" ; "));
    }
    cmd.push_str(&format!("/usr/bin/pmset schedule wake \\\"{datetime}\\\""));
    run_osascript(&format!(
        "do shell script \"{cmd}\" with administrator privileges"
    ))
}

/// Cancel a previously scheduled macOS wake.
#[tauri::command]
fn cancel_wake(datetime: String) -> Result<(), String> {
    if datetime.is_empty() {
        return Ok(());
    }
    let cmd = format!("/usr/bin/pmset schedule cancel wake \\\"{datetime}\\\"");
    run_osascript(&format!(
        "do shell script \"{cmd}\" with administrator privileges"
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            // Menu-bar tray: keep the app alive when the window is closed so
            // alarms still fire, and give the user a way back to the window.
            let show_i = MenuItem::with_id(app, "show", "Show a-clock", true, None::<&str>)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit a-clock", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show_i, &quit_i])?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("a-clock")
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(win) = app.get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.unminimize();
                            let _ = win.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the window hides it (into the tray) instead of quitting.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![greet, schedule_wake, cancel_wake])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
