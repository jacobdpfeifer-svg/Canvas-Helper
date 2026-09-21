//! Window geometry + glass material.
//!
//! Since the 2026-09-17 beta pivot the main window is a normal, resizable
//! study **workspace** (`Workspace`). The ambient sticky-note shell is an
//! opt-in compact mode: `Peek` is the resting size docked in a screen corner,
//! `Expanded` grows it (without moving its corner anchor), and `Onboarding` is
//! the one-time centered size used before a profile exists.

use std::sync::atomic::{AtomicU64, Ordering};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

pub const MAIN_WINDOW: &str = "main";
const MARGIN_LOGICAL: f64 = 20.0;

const PEEK_W: f64 = 320.0;
/// Fits Top3 + optional check CTA; keep in sync with ambient-dock-ui.md.
const PEEK_H: f64 = 300.0;
const EXPANDED_W: f64 = 400.0;
const EXPANDED_HEIGHT_FRACTION: f64 = 0.34;
const ONBOARDING_W: f64 = 560.0;
const ONBOARDING_H: f64 = 680.0;
const WORKSPACE_W: f64 = 1080.0;
const WORKSPACE_H: f64 = 740.0;

/// Frames for Peek↔Expanded eased resize (~180ms).
const ANIM_STEPS: u32 = 6;
const ANIM_STEP_MS: u64 = 30;

static PLACE_GEN: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DockMode {
    Onboarding,
    Peek,
    Expanded,
    Workspace,
}

impl DockMode {
    pub fn parse(raw: &str) -> Option<Self> {
        match raw {
            "onboarding" => Some(Self::Onboarding),
            "peek" => Some(Self::Peek),
            "expanded" => Some(Self::Expanded),
            "workspace" => Some(Self::Workspace),
            _ => None,
        }
    }

    fn compact(self) -> bool {
        matches!(self, Self::Peek | Self::Expanded)
    }
}

fn main_window(app: &AppHandle) -> Result<WebviewWindow, String> {
    app.get_webview_window(MAIN_WINDOW)
        .ok_or_else(|| "main window not found".to_string())
}

fn target_logical(mode: DockMode, work_h_logical: f64) -> (f64, f64) {
    match mode {
        DockMode::Onboarding => (ONBOARDING_W, ONBOARDING_H),
        DockMode::Workspace => (WORKSPACE_W, WORKSPACE_H.min(work_h_logical - 2.0 * MARGIN_LOGICAL)),
        DockMode::Peek => (PEEK_W, PEEK_H),
        DockMode::Expanded => {
            let h = (work_h_logical * EXPANDED_HEIGHT_FRACTION).clamp(420.0, 680.0);
            (EXPANDED_W, h)
        }
    }
}

fn corner_or_center(
    mode: DockMode,
    work_pos: PhysicalPosition<i32>,
    work_size: PhysicalSize<u32>,
    phys_w: u32,
    phys_h: u32,
    margin: i32,
) -> (i32, i32) {
    if matches!(mode, DockMode::Onboarding | DockMode::Workspace) {
        let cx = work_pos.x + (work_size.width as i32 - phys_w as i32) / 2;
        let cy = work_pos.y + (work_size.height as i32 - phys_h as i32) / 2;
        (cx, cy)
    } else {
        let x = work_pos.x + work_size.width as i32 - phys_w as i32 - margin;
        let y = work_pos.y + work_size.height as i32 - phys_h as i32 - margin;
        (x, y)
    }
}

fn ease_out_cubic(t: f64) -> f64 {
    let u = 1.0 - t;
    1.0 - u * u * u
}

/// Resize + reposition the window for `mode`. Peek/Expanded stay anchored to
/// the same bottom-right corner of the work area (menu bar / Dock excluded)
/// so expanding reads as the panel growing up-and-left out of the sticky
/// note, not the window jumping somewhere else. Onboarding centers instead.
///
/// Peek↔Expanded uses a short eased step animation; Onboarding snaps.
pub fn place(window: &WebviewWindow, mode: DockMode) -> tauri::Result<()> {
    let monitor = window
        .primary_monitor()?
        .or(window.current_monitor()?)
        .ok_or_else(|| tauri::Error::FailedToReceiveMessage)?;
    let scale = monitor.scale_factor();
    let work = monitor.work_area();
    let work_h_logical = work.size.height as f64 / scale;
    let margin = (MARGIN_LOGICAL * scale).round() as i32;

    let (logical_w, logical_h) = target_logical(mode, work_h_logical);
    let end_w = (logical_w * scale).round() as u32;
    let end_h = (logical_h * scale).round() as u32;
    let (end_x, end_y) = corner_or_center(mode, work.position, work.size, end_w, end_h, margin);

    // Chrome first, then geometry: a decorated window measures differently.
    let compact = mode.compact();
    let _ = window.set_always_on_top(compact);
    let _ = window.set_decorations(!compact);
    let _ = window.set_resizable(mode == DockMode::Workspace);
    let _ = window.set_skip_taskbar(compact);
    if compact {
        apply_glass(window);
    } else {
        clear_glass(window);
    }

    let animate = compact;
    if !animate {
        window.set_size(PhysicalSize::new(end_w, end_h))?;
        window.set_position(PhysicalPosition::new(end_x, end_y))?;
        return Ok(());
    }

    let start_size = window.outer_size().unwrap_or(PhysicalSize::new(end_w, end_h));

    let gen = PLACE_GEN.fetch_add(1, Ordering::SeqCst) + 1;

    for step in 1..=ANIM_STEPS {
        if PLACE_GEN.load(Ordering::SeqCst) != gen {
            break;
        }
        let t = ease_out_cubic(step as f64 / ANIM_STEPS as f64);
        let w = (start_size.width as f64 + (end_w as f64 - start_size.width as f64) * t).round()
            as u32;
        let h = (start_size.height as f64 + (end_h as f64 - start_size.height as f64) * t).round()
            as u32;
        // Keep bottom-right anchored while interpolating size.
        let x = work.position.x + work.size.width as i32 - w as i32 - margin;
        let y = work.position.y + work.size.height as i32 - h as i32 - margin;
        let _ = window.set_size(PhysicalSize::new(w.max(1), h.max(1)));
        let _ = window.set_position(PhysicalPosition::new(x, y));
        if step < ANIM_STEPS {
            thread::sleep(Duration::from_millis(ANIM_STEP_MS));
        }
    }

    if PLACE_GEN.load(Ordering::SeqCst) == gen {
        window.set_size(PhysicalSize::new(end_w, end_h))?;
        window.set_position(PhysicalPosition::new(end_x, end_y))?;
    }
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

#[cfg(target_os = "macos")]
pub fn clear_glass(window: &WebviewWindow) {
    let _ = window_vibrancy::clear_vibrancy(window);
}

#[cfg(not(target_os = "macos"))]
pub fn apply_glass(_window: &WebviewWindow) {}

#[cfg(not(target_os = "macos"))]
pub fn clear_glass(_window: &WebviewWindow) {}
