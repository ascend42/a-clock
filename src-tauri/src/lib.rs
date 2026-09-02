use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/// Open a YouTube video in a dedicated window and keep it looping by flipping
/// the underlying HTML5 player to `loop = true` (injected before load). This
/// loads the real watch page top-level, so it avoids the iframe Error 153.
#[tauri::command]
fn open_video(app: tauri::AppHandle, url: String) -> Result<(), String> {
    if let Some(existing) = app.get_webview_window("yt-alarm") {
        let _ = existing.close();
    }
    let parsed = tauri::Url::parse(&url).map_err(|e| e.to_string())?;
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
    WebviewWindowBuilder::new(&app, "yt-alarm", WebviewUrl::External(parsed))
        .title("a-clock — video")
        .inner_size(900.0, 540.0)
        .center()
        .initialization_script(loop_script)
        .build()
        .map_err(|e| e.to_string())?;
    Ok(())
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
        .invoke_handler(tauri::generate_handler![greet, open_video])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
