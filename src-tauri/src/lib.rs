mod db;
mod models;

use models::ScannedFile;
use rusqlite::params;
use serde_json::json;
use std::sync::Mutex;
use tauri::{Manager, State};
use walkdir::WalkDir;

struct DbState {
    conn: Mutex<rusqlite::Connection>,
}

#[tauri::command]
fn get_db_files(state: State<'_, DbState>) -> Result<Vec<ScannedFile>, String> {
    let conn = state.conn.lock().unwrap();
    let mut stmt = conn.prepare("SELECT * FROM scanned_files").map_err(|e| e.to_string())?;
    
    let file_iter = stmt.query_map([], |row| {
        Ok(ScannedFile {
            id: row.get(0)?,
            filename: row.get(1)?,
            file_path: row.get(2)?,
            category: row.get(3)?,
            container: row.get(4)?,
            size_gb: row.get(5)?,
            duration_mins: row.get(6)?,
            year: row.get(7)?,
            video_codec: row.get(8)?,
            video_resolution: row.get(9)?,
            video_bitrate_mbps: row.get(10)?,
            audio_tracks: serde_json::from_str(&row.get::<_, String>(11)?).unwrap_or(json!([])),
            subtitle_tracks: serde_json::from_str(&row.get::<_, String>(12)?).unwrap_or(json!([])),
            tags: serde_json::from_str(&row.get::<_, String>(13)?).unwrap_or(json!({})),
            audio_bitrate: row.get(14)?,
            is_corrupted: row.get(15)?,
            error_message: row.get(16)?,
            has_embedded_poster: row.get(17)?,
            bitrate_anomaly: row.get(18)?,
            bitrate_anomaly_reason: row.get(19)?,
            top_level_folder: row.get(20)?,
            stream_friendly_level: row.get(21)?,
            stream_friendly_reason: row.get(22)?,
            stream_friendly_suggestion: row.get(23)?,
            stream_friendly_evaluated: row.get(24)?,
            video_bit_depth: row.get(25).unwrap_or_default(),
            audio_sample_rate: row.get(26).unwrap_or_default(),
            chapter_count: row.get(27).unwrap_or_default(),
            raw_audio_codec: row.get(28).unwrap_or_default(),
            physical_audio_channels: row.get(29).unwrap_or_default(),
            matched_online_id: row.get(30).unwrap_or_default(),
            file_uuid: row.get(31).unwrap_or_default(),
            has_external_subtitles: row.get(32).unwrap_or_default(),
            embedded_subtitle_languages: row.get(33).unwrap_or_default(),
            author: row.get(34).unwrap_or_default(),
            narrator: row.get(35).unwrap_or_default(),
            publisher: row.get(36).unwrap_or_default(),
            book_series: row.get(37).unwrap_or_default(),
            series_index: row.get(38).unwrap_or_default(),
            isbn: row.get(39).unwrap_or_default(),
            page_count: row.get(40).unwrap_or_default(),
        })
    }).map_err(|e| e.to_string())?;
    
    let mut files = Vec::new();
    for file in file_iter {
        files.push(file.map_err(|e| e.to_string())?);
    }
    
    Ok(files)
}

#[tauri::command]
fn clear_db(state: State<'_, DbState>) -> Result<(), String> {
    let conn = state.conn.lock().unwrap();
    conn.execute("DELETE FROM scanned_files", []).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn save_db_files(state: State<'_, DbState>, files: Vec<ScannedFile>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for item in files {
        tx.execute(
            "INSERT INTO scanned_files (
                id, filename, filePath, category, container, sizeGB, durationMins, year,
                videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder,
                streamFriendlyLevel, streamFriendlyReason, streamFriendlySuggestion, streamFriendlyEvaluated,
                videoBitDepth, audioSampleRate, chapterCount, rawAudioCodec, physicalAudioChannels, matchedOnlineId, fileUuid, hasExternalSubtitles, embeddedSubtitleLanguages,
                author, narrator, publisher, bookSeries, seriesIndex, isbn, pageCount
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41)
            ON CONFLICT(id) DO UPDATE SET
                filename=excluded.filename, filePath=excluded.filePath, category=excluded.category, container=excluded.container, sizeGB=excluded.sizeGB, durationMins=excluded.durationMins, year=excluded.year,
                videoCodec=excluded.videoCodec, videoResolution=excluded.videoResolution, videoBitrateMbps=excluded.videoBitrateMbps, audioTracks=excluded.audioTracks, subtitleTracks=excluded.subtitleTracks, tags=excluded.tags, audioBitrate=excluded.audioBitrate, isCorrupted=excluded.isCorrupted, errorMessage=excluded.errorMessage, hasEmbeddedPoster=excluded.hasEmbeddedPoster, bitrateAnomaly=excluded.bitrateAnomaly, bitrateAnomalyReason=excluded.bitrateAnomalyReason, topLevelFolder=excluded.topLevelFolder,
                streamFriendlyLevel=excluded.streamFriendlyLevel, streamFriendlyReason=excluded.streamFriendlyReason, streamFriendlySuggestion=excluded.streamFriendlySuggestion, streamFriendlyEvaluated=excluded.streamFriendlyEvaluated,
                videoBitDepth=excluded.videoBitDepth, audioSampleRate=excluded.audioSampleRate, chapterCount=excluded.chapterCount, rawAudioCodec=excluded.rawAudioCodec, physicalAudioChannels=excluded.physicalAudioChannels, matchedOnlineId=excluded.matchedOnlineId, fileUuid=excluded.fileUuid, hasExternalSubtitles=excluded.hasExternalSubtitles, embeddedSubtitleLanguages=excluded.embeddedSubtitleLanguages,
                author=excluded.author, narrator=excluded.narrator, publisher=excluded.publisher, bookSeries=excluded.bookSeries, seriesIndex=excluded.seriesIndex, isbn=excluded.isbn, pageCount=excluded.pageCount",
            params![
                item.id, item.filename, item.file_path, item.category, item.container, item.size_gb, item.duration_mins, item.year,
                item.video_codec, item.video_resolution, item.video_bitrate_mbps, item.audio_tracks.to_string(), item.subtitle_tracks.to_string(), item.tags.to_string(), item.audio_bitrate, item.is_corrupted, item.error_message, item.has_embedded_poster, item.bitrate_anomaly, item.bitrate_anomaly_reason, item.top_level_folder,
                item.stream_friendly_level, item.stream_friendly_reason, item.stream_friendly_suggestion, item.stream_friendly_evaluated,
                item.video_bit_depth, item.audio_sample_rate, item.chapter_count, item.raw_audio_codec, item.physical_audio_channels, item.matched_online_id, item.file_uuid, item.has_external_subtitles, item.embedded_subtitle_languages,
                item.author, item.narrator, item.publisher, item.book_series, item.series_index, item.isbn, item.page_count
            ],
        ).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

use std::hash::{Hash, Hasher};
use std::collections::hash_map::DefaultHasher;
use std::io::Read;

fn generate_file_hash(path: &std::path::Path, size: u64) -> String {
    let mut hasher = DefaultHasher::new();
    size.hash(&mut hasher);
    
    if let Ok(mut file) = std::fs::File::open(path) {
        let mut buffer = [0u8; 65536];
        if let Ok(bytes_read) = file.read(&mut buffer) {
            buffer[..bytes_read].hash(&mut hasher);
        }
    }
    
    format!("{:016x}", hasher.finish())
}

#[derive(serde::Serialize)]
#[allow(non_snake_case)]
struct FileEntry {
    path: String,
    size: u64,
    fileHash: String,
}

#[tauri::command]
fn walk_dir(path: String) -> Result<Vec<FileEntry>, String> {
    let path_obj = std::path::Path::new(&path);
    if !path_obj.exists() {
        return Err(format!("The folder directory '{}' does not exist.", path));
    }
    if !path_obj.is_dir() {
        return Err(format!("The specified path '{}' is not a valid directory.", path));
    }
    if let Err(e) = std::fs::read_dir(&path) {
        return Err(format!("Permission denied or directory inaccessible for '{}': {}", path, e));
    }

    let mut files = Vec::new();
    for entry_res in WalkDir::new(&path).follow_links(true).into_iter() {
        match entry_res {
            Ok(entry) => {
                if entry.file_type().is_file() {
                    let path_str = if let Some(p_str) = entry.path().to_str() {
                        p_str.to_string()
                    } else {
                        entry.path().to_string_lossy().into_owned()
                    };
                    let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                    let file_hash = generate_file_hash(entry.path(), size);
                    files.push(FileEntry {
                        path: path_str,
                        size,
                        fileHash: file_hash,
                    });
                }
            }
            Err(e) => {
                eprintln!("Warning: WalkDir item skipped in '{}': {}", path, e);
            }
        }
    }

    Ok(files)
}

#[tauri::command]
fn get_diagnostic() -> serde_json::Value {
    let cpus = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(1);
    json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "appVersion": "1.3.0",
        "ffprobePath": "ffprobe (bundled sidecar)",
        "cpus": cpus
    })
}


#[tauri::command]
fn save_settings(settings: String) -> Result<(), String> {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let data_dir = exe_path.parent().unwrap_or(std::path::Path::new("")).to_path_buf();
    let settings_path = data_dir.join("bitscribe_settings.json");
    std::fs::write(settings_path, settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_settings() -> Result<String, String> {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let data_dir = exe_path.parent().unwrap_or(std::path::Path::new("")).to_path_buf();
    let settings_path = data_dir.join("bitscribe_settings.json");
    if !settings_path.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(settings_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_file(path: String, contents_b64: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let bytes = STANDARD.decode(&contents_b64).map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let data_dir = exe_path.parent().unwrap_or(std::path::Path::new("")).to_path_buf();
    
    // Make WebView2 strictly portable on Windows by placing its cache/localstorage next to the exe
    #[cfg(target_os = "windows")]
    {
        std::env::set_var("WEBVIEW2_USER_DATA_FOLDER", data_dir.join("BitScribeData").to_str().unwrap_or(""));
    }

    tauri::Builder::default()
        .setup(move |app| {
            let conn = db::init_db(&data_dir).expect("Failed to initialize database");
            
            app.manage(DbState {
                conn: Mutex::new(conn),
            });
            
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            save_file,
            get_db_files,
            clear_db,
            save_db_files,
            get_diagnostic,
            walk_dir,
            save_settings,
            load_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
