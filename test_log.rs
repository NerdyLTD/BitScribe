fn main() {
    tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder(".".into()));
}
