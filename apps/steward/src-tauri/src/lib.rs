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

fn resolve_data_dir() -> std::path::PathBuf {
    let exe_path = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe_path.parent().unwrap_or(std::path::Path::new("")).to_path_buf();

    if exe_dir.join(".portable").exists() {
        return exe_dir;
    }
    
    let exe_str = exe_dir.to_string_lossy().to_lowercase();
    let is_program_files = exe_str.contains("program files");
    let is_applications = exe_str.contains("/applications") || exe_str.contains("/appdir");
    let is_usr_bin = exe_str.contains("/usr/bin") || exe_str.contains("/opt/");
    
    if !is_program_files && !is_applications && !is_usr_bin {
        let test_file = exe_dir.join(".write_test");
        if std::fs::File::create(&test_file).is_ok() {
            let _ = std::fs::remove_file(test_file);
            return exe_dir;
        }
    }
    
    #[cfg(target_os = "windows")]
    {
        if let Ok(appdata) = std::env::var("LOCALAPPDATA") {
            let path = std::path::PathBuf::from(appdata).join("BitScribeSteward");
            std::fs::create_dir_all(&path).ok();
            return path;
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let path = std::path::PathBuf::from(home).join("Library/Application Support/com.bitscribe.steward");
            std::fs::create_dir_all(&path).ok();
            return path;
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        if let Ok(home) = std::env::var("HOME") {
            let path = std::path::PathBuf::from(home).join(".config/BitScribeSteward");
            std::fs::create_dir_all(&path).ok();
            return path;
        }
    }
    
    exe_dir
}


#[tauri::command]
async fn get_db_files(state: State<'_, DbState>, limit: Option<u32>, offset: Option<u32>) -> Result<Vec<ScannedFile>, String> {
    let conn = state.conn.lock().unwrap();
    let mut query = "SELECT \
        id, filename, filePath, category, container, sizeGB, durationMins, year, \
        videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder, \
        streamFriendlyLevel, streamFriendlyReason, streamFriendlySuggestion, streamFriendlyEvaluated, \
        videoBitDepth, audioSampleRate, chapterCount, rawAudioCodec, physicalAudioChannels, matchedOnlineId, fileUuid, hasExternalSubtitles, embeddedSubtitleLanguages, \
        author, narrator, publisher, bookSeries, seriesIndex, isbn, pageCount, videoFrameRate \
        FROM scanned_files ORDER BY id".to_string();
        
    if let (Some(l), Some(o)) = (limit, offset) {
        query.push_str(&format!(" LIMIT {} OFFSET {}", l, o));
    }
    
    let mut stmt = conn.prepare(&query).map_err(|e| e.to_string())?;
    
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
            video_frame_rate: row.get(41).unwrap_or_default(),
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
async fn delete_db_files(state: State<'_, DbState>, ids: Vec<String>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    for id in ids {
        tx.execute("DELETE FROM scanned_files WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn save_db_files(state: State<'_, DbState>, files: Vec<ScannedFile>) -> Result<(), String> {
    let mut conn = state.conn.lock().unwrap();
    let tx = conn.transaction().map_err(|e| e.to_string())?;
    
    {
        let mut stmt = tx.prepare(
            "INSERT INTO scanned_files (
                id, filename, filePath, category, container, sizeGB, durationMins, year,
                videoCodec, videoResolution, videoBitrateMbps, audioTracks, subtitleTracks, tags, audioBitrate, isCorrupted, errorMessage, hasEmbeddedPoster, bitrateAnomaly, bitrateAnomalyReason, topLevelFolder,
                streamFriendlyLevel, streamFriendlyReason, streamFriendlySuggestion, streamFriendlyEvaluated,
                videoBitDepth, audioSampleRate, chapterCount, rawAudioCodec, physicalAudioChannels, matchedOnlineId, fileUuid, hasExternalSubtitles, embeddedSubtitleLanguages,
                author, narrator, publisher, bookSeries, seriesIndex, isbn, pageCount, videoFrameRate
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24, ?25, ?26, ?27, ?28, ?29, ?30, ?31, ?32, ?33, ?34, ?35, ?36, ?37, ?38, ?39, ?40, ?41, ?42)
            ON CONFLICT(id) DO UPDATE SET
                filename=excluded.filename, filePath=excluded.filePath, category=excluded.category, container=excluded.container, sizeGB=excluded.sizeGB, durationMins=excluded.durationMins, year=excluded.year,
                videoCodec=excluded.videoCodec, videoResolution=excluded.videoResolution, videoBitrateMbps=excluded.videoBitrateMbps, audioTracks=excluded.audioTracks, subtitleTracks=excluded.subtitleTracks, tags=excluded.tags, audioBitrate=excluded.audioBitrate, isCorrupted=excluded.isCorrupted, errorMessage=excluded.errorMessage, hasEmbeddedPoster=excluded.hasEmbeddedPoster, bitrateAnomaly=excluded.bitrateAnomaly, bitrateAnomalyReason=excluded.bitrateAnomalyReason, topLevelFolder=excluded.topLevelFolder,
                streamFriendlyLevel=excluded.streamFriendlyLevel, streamFriendlyReason=excluded.streamFriendlyReason, streamFriendlySuggestion=excluded.streamFriendlySuggestion, streamFriendlyEvaluated=excluded.streamFriendlyEvaluated,
                videoBitDepth=excluded.videoBitDepth, audioSampleRate=excluded.audioSampleRate, chapterCount=excluded.chapterCount, rawAudioCodec=excluded.rawAudioCodec, physicalAudioChannels=excluded.physicalAudioChannels, matchedOnlineId=excluded.matchedOnlineId, fileUuid=excluded.fileUuid, hasExternalSubtitles=excluded.hasExternalSubtitles, embeddedSubtitleLanguages=excluded.embeddedSubtitleLanguages,
                author=excluded.author, narrator=excluded.narrator, publisher=excluded.publisher, bookSeries=excluded.bookSeries, seriesIndex=excluded.seriesIndex, isbn=excluded.isbn, pageCount=excluded.pageCount, videoFrameRate=excluded.videoFrameRate"
        ).map_err(|e| e.to_string())?;

        for item in files {
            stmt.execute(
                params![
                    item.id, item.filename, item.file_path, item.category, item.container, item.size_gb, item.duration_mins, item.year,
                    item.video_codec, item.video_resolution, item.video_bitrate_mbps, item.audio_tracks.to_string(), item.subtitle_tracks.to_string(), item.tags.to_string(), item.audio_bitrate, item.is_corrupted, item.error_message, item.has_embedded_poster, item.bitrate_anomaly, item.bitrate_anomaly_reason, item.top_level_folder,
                    item.stream_friendly_level, item.stream_friendly_reason, item.stream_friendly_suggestion, item.stream_friendly_evaluated,
                    item.video_bit_depth, item.audio_sample_rate, item.chapter_count, item.raw_audio_codec, item.physical_audio_channels, item.matched_online_id, item.file_uuid, item.has_external_subtitles, item.embedded_subtitle_languages,
                    item.author, item.narrator, item.publisher, item.book_series, item.series_index, item.isbn, item.page_count, item.video_frame_rate
                ]
            ).map_err(|e| e.to_string())?;
        }
    }
    
    tx.commit().map_err(|e| e.to_string())?;
    Ok(())
}


fn generate_file_hash(path: &std::path::Path, metadata: &std::fs::Metadata) -> String {
    // Use a deterministic FNV-1a hash.
    let mut hash: u64 = 0xcbf29ce484222325;
    
    let mut mix = |bytes: &[u8]| {
        for &b in bytes {
            hash ^= b as u64;
            hash = hash.wrapping_mul(0x100000001b3);
        }
    };
    
    // Factor 1: File Size
    mix(&metadata.len().to_le_bytes());
    
    // Factor 2 & 3: Creation Time & Modified Time
    if let Ok(created) = metadata.created().unwrap_or_else(|_| std::time::UNIX_EPOCH).duration_since(std::time::UNIX_EPOCH) {
        mix(&created.as_secs().to_le_bytes());
        mix(&created.subsec_nanos().to_le_bytes());
    }
    
    if let Ok(modified) = metadata.modified().unwrap_or_else(|_| std::time::UNIX_EPOCH).duration_since(std::time::UNIX_EPOCH) {
        mix(&modified.as_secs().to_le_bytes());
        mix(&modified.subsec_nanos().to_le_bytes());
    }
    
    // Factor 4: File Name only (NOT full path)
    // Allows the file to be moved across directories while keeping the same hash,
    // avoiding the heavy performance penalty of reading file contents over a network drive.
    if let Some(file_name) = path.file_name() {
        mix(file_name.to_string_lossy().as_bytes());
    }
    
    format!("{:016x}", hash)
}

#[derive(serde::Serialize)]
#[allow(non_snake_case)]
struct FileEntry {
    path: String,
    size: u64,
    fileHash: String,
    hasExternalSubtitles: bool,
}

#[tauri::command]
async fn walk_dir(path: String) -> Result<Vec<FileEntry>, String> {
    use std::collections::HashMap;
    use std::path::PathBuf;

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

    let mut discovered_media: Vec<(PathBuf, String, u64, String)> = Vec::new();
    let mut subtitles_map: HashMap<PathBuf, Vec<String>> = HashMap::new();

    let mut iterator = WalkDir::new(&path).follow_links(true).into_iter();
    loop {
        let entry_res = match iterator.next() {
            Some(res) => res,
            None => break,
        };
        match entry_res {
            Ok(entry) => {
                let os_name = entry.file_name();
                if entry.file_type().is_dir() {
                    let mut should_skip = false;
                    if let Some(file_name) = os_name.to_str() {
                        if file_name.starts_with('.') 
                            || file_name.eq_ignore_ascii_case("node_modules")
                            || file_name.eq_ignore_ascii_case("$RECYCLE.BIN")
                            || file_name.eq_ignore_ascii_case("System Volume Information")
                            || file_name.eq_ignore_ascii_case(".git")
                            || file_name.eq_ignore_ascii_case("target")
                            || file_name.eq_ignore_ascii_case("__MACOSX")
                        {
                            should_skip = true;
                        }
                    } else {
                        let file_name = os_name.to_string_lossy();
                        if file_name.starts_with('.') 
                            || file_name.eq_ignore_ascii_case("node_modules")
                            || file_name.eq_ignore_ascii_case("$RECYCLE.BIN")
                            || file_name.eq_ignore_ascii_case("System Volume Information")
                            || file_name.eq_ignore_ascii_case(".git")
                            || file_name.eq_ignore_ascii_case("target")
                            || file_name.eq_ignore_ascii_case("__MACOSX")
                        {
                            should_skip = true;
                        }
                    }
                    if should_skip {
                        iterator.skip_current_dir();
                    }
                    continue;
                }

                if entry.file_type().is_file() {
                    let os_name_str = os_name.to_string_lossy();
                    if os_name_str.starts_with('.') {
                        continue;
                    }
                    let path_ref = entry.path();
                    let ext_opt = path_ref.extension().and_then(|s| s.to_str());

                    let mut is_sub = false;
                    if let Some(ext) = ext_opt {
                        if ext.eq_ignore_ascii_case("srt") 
                            || ext.eq_ignore_ascii_case("ass") 
                            || ext.eq_ignore_ascii_case("vtt") 
                            || ext.eq_ignore_ascii_case("sub") 
                        {
                            is_sub = true;
                        }
                    }

                    if is_sub {
                        if let Some(parent) = path_ref.parent() {
                            let sub_name_lower = os_name.to_string_lossy().to_lowercase();
                            subtitles_map.entry(parent.to_path_buf())
                                .or_default()
                                .push(sub_name_lower);
                        }
                        continue;
                    }
                    
                    const ALLOWED_EXTENSIONS: &[&str] = &[
                        "mkv", "mp4", "avi", "mov", "wmv", "flv", "webm", "m4v", "mpg", "mpeg", "m2ts", "ts", "vob", "mxf",
                        "mp3", "flac", "m4a", "wav", "aac", "ogg", "wma", "alac", "m4b", "ape", "opus", "mka"
                    ];
                    
                    let mut is_allowed = false;
                    if let Some(ext) = ext_opt {
                        for allowed in ALLOWED_EXTENSIONS {
                            if ext.eq_ignore_ascii_case(allowed) {
                                is_allowed = true;
                                break;
                            }
                        }
                    }
                    
                    if !is_allowed {
                        continue;
                    }

                    let path_str = if let Some(p_str) = entry.path().to_str() {
                        p_str.to_string()
                    } else {
                        entry.path().to_string_lossy().into_owned()
                    };
                    let metadata = entry.metadata();
                    if metadata.is_err() { continue; }
                    let meta = metadata.unwrap();
                    let size = meta.len();
                    let file_hash = generate_file_hash(entry.path(), &meta);

                    discovered_media.push((path_ref.to_path_buf(), path_str, size, file_hash));
                }
            }
            Err(e) => {
                eprintln!("Warning: WalkDir item skipped in '{}': {}", path, e);
            }
        }
    }

    let mut files = Vec::new();
    for (path_buf, path_str, size, file_hash) in discovered_media {
        let mut has_ext_subs = false;
        if let Some(parent) = path_buf.parent() {
            if let Some(subs) = subtitles_map.get(parent) {
                let file_stem = path_buf.file_stem()
                    .map(|s| s.to_string_lossy().to_lowercase())
                    .unwrap_or_default();
                if !file_stem.is_empty() {
                    for sub_name in subs {
                        if sub_name.starts_with(&file_stem) {
                            let suffix = &sub_name[file_stem.len()..];
                            if suffix.starts_with('.') && (suffix.ends_with(".srt") || suffix.ends_with(".ass") || suffix.ends_with(".vtt") || suffix.ends_with(".sub")) {
                                has_ext_subs = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        files.push(FileEntry {
            path: path_str,
            size,
            fileHash: file_hash,
            hasExternalSubtitles: has_ext_subs,
        });
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
    let data_dir = resolve_data_dir();
    let settings_path = data_dir.join("bitscribe_settings.json");
    std::fs::write(settings_path, settings).map_err(|e| e.to_string())
}

#[tauri::command]
fn load_settings() -> Result<String, String> {
    let data_dir = resolve_data_dir();
    let settings_path = data_dir.join("bitscribe_settings.json");
    if !settings_path.exists() {
        return Ok("{}".to_string());
    }
    std::fs::read_to_string(settings_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn clear_settings() -> Result<(), String> {
    let data_dir = resolve_data_dir();
    let settings_path = data_dir.join("bitscribe_settings.json");
    if settings_path.exists() {
        std::fs::remove_file(settings_path).map_err(|e| e.to_string())
    } else {
        Ok(())
    }
}

#[tauri::command]
fn get_data_dir() -> String {
    let data_dir = resolve_data_dir();
    data_dir.to_string_lossy().to_string()
}

#[tauri::command]
fn save_file(path: String, contents_b64: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};
    let bytes = STANDARD.decode(&contents_b64).map_err(|e| e.to_string())?;
    std::fs::write(path, bytes).map_err(|e| e.to_string())
}



#[tauri::command]
fn setup_ffprobe(app: tauri::AppHandle) -> Result<String, String> {
    let app_data_dir = resolve_data_dir();
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        let target_bin = app_data_dir.join("ffprobe.exe");
        if !target_bin.exists() {
            let bytes = include_bytes!("../bin/ffprobe-x86_64-pc-windows-msvc.exe");
            std::fs::write(&target_bin, bytes).map_err(|e| e.to_string())?;
        }
        return Ok(target_bin.to_string_lossy().to_string());
    }

    #[cfg(target_os = "linux")]
    {
        let target_bin = app_data_dir.join("ffprobe");
        if !target_bin.exists() {
            let bytes = include_bytes!("../bin/ffprobe-x86_64-unknown-linux-gnu");
            std::fs::write(&target_bin, bytes).map_err(|e| e.to_string())?;
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = std::fs::metadata(&target_bin) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                let _ = std::fs::set_permissions(&target_bin, perms);
            }
        }
        return Ok(target_bin.to_string_lossy().to_string());
    }

    #[cfg(target_os = "macos")]
    {
        let dest_bin_name = if std::env::consts::ARCH == "aarch64" {
            "ffprobe-aarch64-apple-darwin"
        } else {
            "ffprobe-x86_64-apple-darwin"
        };
        let target_bin = app_data_dir.join(dest_bin_name);

        if !target_bin.exists() {
            let resource_path = app
                .path()
                .resolve("resources/mac_ffprobe.tar.gz", tauri::path::BaseDirectory::Resource)
                .map_err(|e| e.to_string())?;

            let output = std::process::Command::new("tar")
                .arg("-xzf")
                .arg(&resource_path)
                .arg("-C")
                .arg(&app_data_dir)
                .output()
                .map_err(|e| format!("Failed to execute tar: {}", e))?;

            if !output.status.success() {
                return Err(format!("Tar extraction failed: {}", String::from_utf8_lossy(&output.stderr)));
            }
            
            use std::os::unix::fs::PermissionsExt;
            if let Ok(metadata) = std::fs::metadata(&target_bin) {
                let mut perms = metadata.permissions();
                perms.set_mode(0o755);
                let _ = std::fs::set_permissions(&target_bin, perms);
            }
            
            let _ = std::process::Command::new("xattr")
                .arg("-d")
                .arg("com.apple.quarantine")
                .arg(&target_bin)
                .output();
        }
        return Ok(target_bin.to_string_lossy().to_string());
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
    {
        return Err("Unsupported OS".to_string());
    }
}


#[tauri::command]
async fn run_ffprobe(bin_path: String, args: Vec<String>) -> Result<String, String> {
    // Add a 15-second timeout in Rust so processes don't become orphaned zombies
    let mut command = tokio::process::Command::new(bin_path);
    command.args(&args);
    
    #[cfg(target_os = "windows")]
    command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    
    // tokio::process::Command natively handles killing the child if the command is dropped,
    // but since we await output(), we need to wrap it in a tokio::time::timeout
    
    // We also use kill_on_drop(true) to ensure the child is killed if the future is dropped
    command.kill_on_drop(true);

    let output_future = command.output();
    let result = tokio::time::timeout(std::time::Duration::from_secs(15), output_future).await;

    match result {
        Ok(Ok(output)) => {
            if !output.status.success() {
                return Err(String::from_utf8_lossy(&output.stderr).to_string());
            }
            Ok(String::from_utf8_lossy(&output.stdout).to_string())
        }
        Ok(Err(e)) => Err(e.to_string()),
        Err(_) => Err("ffprobe execution timed out after 15 seconds".to_string()),
    }
}


use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::{Path, PathBuf};
use chrono::Local;

#[tauri::command]
fn log_event(
    _app: tauri::AppHandle,
    level: String,
    system: String,
    message: String,
    is_diagnostic: bool,
) -> Result<(), String> {
    let app_data_dir = resolve_data_dir();
    let logs_dir = app_data_dir.join("logs");
    
    if !logs_dir.exists() {
        fs::create_dir_all(&logs_dir).map_err(|e| e.to_string())?;
    }

    let date_str = Local::now().format("%Y-%m-%d").to_string();
    
    let prefix = if is_diagnostic { "diagnostic_" } else { "standard_" };
    
    // We will append to a single active file for the day
    let log_file_name = format!("{}{}.txt", prefix, date_str);
    let log_file_path = logs_dir.join(&log_file_name);

    let timestamp = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let log_entry = format!("[{}] [{}] [{}] {}\n", timestamp, level.to_uppercase(), system, message);

    if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(&log_file_path) {
        let _ = file.write_all(log_entry.as_bytes());
    }

    // Check sizes and rotate
    let max_size: u64 = if is_diagnostic { 10 * 1024 * 1024 } else { 5 * 1024 * 1024 };
    let max_files = if is_diagnostic { 2 } else { 3 };

    if let Ok(metadata) = fs::metadata(&log_file_path) {
        if metadata.len() > max_size {
            let time_str = Local::now().format("%H-%M-%S").to_string();
            let rotated_name = format!("{}{}_{}.txt", prefix, date_str, time_str);
            let rotated_path = logs_dir.join(rotated_name);
            let _ = fs::rename(&log_file_path, &rotated_path);
        }
    }

    cleanup_old_logs(&logs_dir, prefix, max_files);

    Ok(())
}

fn cleanup_old_logs(logs_dir: &Path, prefix: &str, max_files: usize) {
    if let Ok(entries) = fs::read_dir(logs_dir) {
        let mut files: Vec<PathBuf> = entries
            .filter_map(Result::ok)
            .map(|e| e.path())
            .filter(|p| {
                p.is_file() 
                && p.file_name().and_then(|n| n.to_str()).map(|s| s.starts_with(prefix)).unwrap_or(false)
            })
            .collect();

        files.sort_by(|a, b| {
            let meta_a = fs::metadata(a).and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            let meta_b = fs::metadata(b).and_then(|m| m.modified()).unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            meta_b.cmp(&meta_a) // Newest first
        });

        if files.len() > max_files {
            for file in files.into_iter().skip(max_files) {
                let _ = fs::remove_file(file);
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let data_dir = resolve_data_dir();
    
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
            
            app.handle().plugin(
                tauri_plugin_log::Builder::default()
                    .targets([
                        tauri_plugin_log::Target::new(tauri_plugin_log::TargetKind::Stdout),
                        
                    ])
                    .level(log::LevelFilter::Info)
                    .build(),
            )?;
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_data_dir,
            save_file,
            get_db_files,
            clear_db,
            save_db_files,
            get_diagnostic,
            setup_ffprobe,
            run_ffprobe,
            walk_dir,
            save_settings,
            load_settings,
            clear_settings,
            delete_db_files,
            log_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
