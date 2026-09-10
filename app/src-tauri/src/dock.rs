//! Window geometry + glass material for the ambient "sticky note" shell.
//!
//! The app is one borderless, always-on-top, transparent window that never
//! becomes a normal full desktop app: `Peek` is the resting sticky-note size
//! docked in a screen corner, `Expanded` grows it (without moving its corner
//! anchor) to show the palette/approval/ledger overlays, and `Onboarding` is
//! the one-time centered size used before a school + legal acceptance exist.

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

pub const MAIN_WINDOW: &str = "main";
const MARGIN_LOGICAL: f64 = 20.0;

const PEEK_W: f64 = 320.0;
const PEEK_H: f64 = 300.0;
const EXPANDED_W: f64 = 400.0;
const EXPANDED_HEIGHT_FRACTION: f64 = 0.34;
const ONBOARDING_W: f64 = 460.0;
const ONBOARDING_H: f64 = 640.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DockMode {
    Onboarding,
    Peek,
    Expanded,
}

impl DockMode {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "onboarding" => Some(Self::Onboarding),
            "peek" => Some(Self::Peek),
            "expanded" => Some(Self::Expanded),
            _ => None,
        }
    }
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(MAIN_WINDOW)
        .ok_or_else(|| "main window not found".to_string())
}

/// Resize + reposition the window for `mode`. Peek/Expanded stay anchored to
/// the same bottom-right corner of the work area (menu bar / Dock excluded)
/// so expanding reads as the panel growing up-and-left out of the sticky
/// note, not the window jumping somewhere else. Onboarding centers instead.
pub fn place(window: &WebviewWindow, mode: DockMode) -> tauri::Result<()> {
    let monitor = window
        .primary_monitor()?
        .or(window.current_monitor()?)
        .ok_or_else(|| tauri::Error::FailedToReceiveMessage)?;
    let scale = monitor.scale_factor();
    let work = monitor.work_area();

    let (logical_w, logical_h) = match mode {
        DockMode::Onboarding => (ONBOARDING_W, ONBOARDING_H),
        DockMode::Peek => (PEEK_W, PEEK_H),
        DockMode::Expanded => {
            let work_h_logical = work.size.height as f64 / scale;
            let h = (work_h_logical * EXPANDED_HEIGHT_FRACTION).clamp(420.0, 680.0);
            (EXPANDED_W, h)
        }
    };

    let phys_w = (logical_w * scale).round() as u32;
    let phys_h = (logical_h * scale).round() as u32;
    window.set_size(PhysicalSize::new(phys_w, phys_h))?;

    let margin = (MARGIN_LOGICAL * scale).round() as i32;
    let (x, y) = if mode == DockMode::Onboarding {
        let cx = work.position.x + (work.size.width as i32 - phys_w as i32) / 2;
        let cy = work.position.y + (work.size.height as i32 - phys_h as i32) / 2;
        (cx, cy)
    } else {
        let x = work.position.x + work.size.width as i32 - phys_w as i32 - margin;
        let y = work.position.y + work.size.height as i32 - phys_h as i32 - margin;
        (x, y)
    };
    window.set_position(PhysicalPosition::new(x, y))?;
    Ok(())
}

pub fn set_mode(app: &AppHandle, mode: DockMode) -> Result<(), String> {
    let window = main_window(app)?;
    place(&window, mode).map_err(|e| e.to_string())
}

pub fn show_peek(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    place(&window, DockMode::Peek).map_err(|e| e.to_string())?;
    window.show().map_err(|e| e.to_string())?;
    let _ = window.set_focus();
    Ok(())
}

pub fn hide(app: &AppHandle) -> Result<(), String> {
    main_window(app)?.hide().map_err(|e| e.to_string())
}

pub fn toggle(app: &AppHandle) -> Result<(), String> {
    let window = main_window(app)?;
    let visible = window.is_visible().map_err(|e| e.to_string())?;
    if visible {
        window.hide().map_err(|e| e.to_string())
    } else {
        drop(window);
        show_peek(app)
    }
}

#[tauri::command]
pub fn set_dock_mode(app: AppHandle, mode: String) -> Result<(), String> {
    let mode = DockMode::parse(&mode).ok_or_else(|| format!("unknown dock mode: {mode}"))?;
    set_mode(&app, mode)
}

#[tauri::command]
pub fn show_dock(app: AppHandle) -> Result<(), String> {
    show_peek(&app)
}

#[tauri::command]
pub fn hide_dock(app: AppHandle) -> Result<(), String> {
    hide(&app)
}

/// Frosted-glass material behind the transparent window. macOS only for now
/// (Windows acrylic/mica would hang off the same call site later).
#[cfg(target_os = "macos")]
pub fn apply_glass(window: &WebviewWindow) {
    use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial, NSVisualEffectState};

    let _ = apply_vibrancy(
        window,
        NSVisualEffectMaterial::HudWindow,
        Some(NSVisualEffectState::Active),
        Some(16.0),
    );
}

#[cfg(not(target_os = "macos"))]
pub fn apply_glass(_window: &WebviewWindow) {}
