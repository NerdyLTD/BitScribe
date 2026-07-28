const fs = require('fs');
let lib = fs.readFileSync('apps/steward/src-tauri/src/lib.rs', 'utf8');

const targetStr = `#[tauri::command]
fn save_file(path: String, contents_b64: String) -> Result<(), String> {`;

const newStr = `#[tauri::command]
fn get_data_dir() -> String {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let data_dir = exe_path.parent().unwrap_or(std::path::Path::new("")).to_path_buf();
    data_dir.to_string_lossy().to_string()
}

#[tauri::command]
fn save_file(path: String, contents_b64: String) -> Result<(), String> {`;

lib = lib.replace(targetStr, newStr);

const targetHandler = `save_file,`;
const newHandler = `get_data_dir,
            save_file,`;
lib = lib.replace(targetHandler, newHandler);

fs.writeFileSync('apps/steward/src-tauri/src/lib.rs', lib);
