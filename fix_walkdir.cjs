const fs = require('fs');
let code = fs.readFileSync('src-tauri/src/lib.rs', 'utf8');

code = code.replace(
  `#[tauri::command]
async fn walk_dir(path: String) -> Result<Vec<String>, String> {
    let mut files = Vec::new();
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Some(path_str) = entry.path().to_str() {
                files.push(path_str.to_string());
            }
        }
    }
    Ok(files)
}`,
  `#[derive(serde::Serialize)]
struct FileEntry {
    path: String,
    size: u64,
}

#[tauri::command]
async fn walk_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let mut files = Vec::new();
    for entry in WalkDir::new(&path).into_iter().filter_map(|e| e.ok()) {
        if entry.file_type().is_file() {
            if let Some(path_str) = entry.path().to_str() {
                let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                files.push(FileEntry {
                    path: path_str.to_string(),
                    size,
                });
            }
        }
    }
    Ok(files)
}`
);

fs.writeFileSync('src-tauri/src/lib.rs', code);
console.log('Fixed lib.rs');
