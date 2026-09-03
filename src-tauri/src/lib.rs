use tauri::Manager;
#[cfg(desktop)]
use tauri::{WebviewUrl, WebviewWindowBuilder};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Open a YouTube video in a dedicated window and keep it looping by flipping
/// the underlying HTML5 player to `loop = true` (injected before load). This
/// loads the real watch page top-level, so it avoids the iframe Error 153.
/// Desktop-only (the window-builder positioning APIs don't exist on mobile);
/// mobile opens YouTube in the system browser instead.
#[tauri::command]
fn open_video(_app: tauri::AppHandle, _url: String) -> Result<(), String> {
    #[cfg(desktop)]
    {
        if let Some(existing) = _app.get_webview_window("yt-alarm") {
            let _ = existing.close();
        }
        let parsed = tauri::Url::parse(&_url).map_err(|e| e.to_string())?;
        let loop_script = r#"
          (function () {
            function keepLooping() {
              var v = document.querySelector('video');
              if (v) {
                v.loop = true;
                if (v.ended) { try { v.currentTime = 0; v.play(); } catch (e) {} }
              }
            }
            setInterval(keepLooping, 1000);
          })();
        "#;
        WebviewWindowBuilder::new(&_app, "yt-alarm", WebviewUrl::External(parsed))
            .title("a-clock — video")
            .inner_size(900.0, 540.0)
            .center()
            .initialization_script(loop_script)
            .build()
            .map_err(|e| e.to_string())?;
        Ok(())
    }
    #[cfg(not(desktop))]
    Err("video window is desktop-only".into())
}

/// Copy a picked media file into the app's data directory so it is durably
/// owned by the app (survives the original moving/deleting) and playable
/// in-app on iOS, where a raw picked path isn't accessible to the webview.
#[tauri::command]
fn import_media(app: tauri::AppHandle, src: String) -> Result<String, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("library");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let name = std::path::Path::new(&src)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "media".to_string());
    let dst = dir.join(&name);
    std::fs::copy(&src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().to_string())
}

/// Desktop-only setup: a menu-bar tray so the app stays alive (and the alarm
/// scheduler keeps running) when the window is closed. Not applicable on mobile.
#[cfg(desktop)]
fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    use tauri::{
        menu::{Menu, MenuItem},
        tray::TrayIconBuilder,
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
                // Only the main window hides into the tray; auxiliary windows
                // (e.g. the YouTube video window) close normally.
                if window.label() == "main" {
                    let _ = window.hide();
                    api.prevent_close();
                }
            }
        });

    builder
        .invoke_handler(tauri::generate_handler![greet, open_video, import_media])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
