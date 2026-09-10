fn main() {
    let attrs = tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "set_dock_mode",
            "show_dock",
            "hide_dock",
            "sync_canvas",
            "read_top3",
            "open_canvas_sso",
            "save_onboarding",
            "save_learning_profile",
            "read_due_reviews",
            "read_brief_streak",
            "read_learn_progress",
            "read_evaluation_compare",
            "record_review_outcome",
            "read_commitment",
            "set_commitment",
            "resolve_commitment",
            "read_check_intention",
            "route_intent",
        ]),
    );
    tauri_build::try_build(attrs).expect("failed to run tauri-build");
}
