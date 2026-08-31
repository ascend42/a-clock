// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Run an AppleScript snippet (used to invoke `pmset` with admin rights, which
/// prompts the user for authorization the first time / when the wake changes).
/// macOS-only; on other platforms this is a harmless no-op.
#[cfg(target_os = "macos")]
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
fn schedule_wake(_datetime: String, _previous: Option<String>) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let mut cmd = String::new();
        if let Some(prev) = _previous.filter(|p| !p.is_empty()) {
            cmd.push_str(&format!("/usr/bin/pmset schedule cancel wake \\\"{prev}\\\" ; "));
        }
        cmd.push_str(&format!("/usr/bin/pmset schedule wake \\\"{_datetime}\\\""));
        return run_osascript(&format!(
            "do shell script \"{cmd}\" with administrator privileges"
        ));
    }
    #[cfg(not(target_os = "macos"))]
    Err("wake scheduling is only supported on macOS".into())
}

/// Cancel a previously scheduled macOS wake.
#[tauri::command]
fn cancel_wake(_datetime: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        if _datetime.is_empty() {
            return Ok(());
        }
        let cmd = format!("/usr/bin/pmset schedule cancel wake \\\"{_datetime}\\\"");
        return run_osascript(&format!(
            "do shell script \"{cmd}\" with administrator privileges"
        ));
    }
    #[cfg(not(target_os = "macos"))]
    Ok(())
}

/// Desktop-only setup: a menu-bar tray so the app stays alive (and the alarm
/// scheduler keeps running) when the window is closed. Not applicable on mobile.
#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
        Manager,
    };

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
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init());

    // Tray + hide-on-close are desktop-only concepts.
    #[cfg(desktop)]
    let builder = builder
        .setup(|app| {
            setup_tray(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        });

    builder
        .invoke_handler(tauri::generate_handler![greet, schedule_wake, cancel_wake])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
