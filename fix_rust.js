const fs = require('fs');
let lib = fs.readFileSync('apps/steward/src-tauri/src/lib.rs', 'utf8');

const targetStr = `            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::LogDir { file_name: None }),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder(data_dir.clone()))
                    ])
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;`;

const newStr = `            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Folder(data_dir.clone()))
                    ])
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;`;

lib = lib.replace(targetStr, newStr);
fs.writeFileSync('apps/steward/src-tauri/src/lib.rs', lib);
