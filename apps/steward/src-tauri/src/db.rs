use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn init_db(data_dir: &PathBuf) -> Result<Connection> {
    let db_dir = data_dir.join("BitScribeDB");
    std::fs::create_dir_all(&db_dir).ok();
    let db_path = db_dir.join("steward.db");
    
    let conn = Connection::open(db_path)?;
    
    // Optimize SQLite connection performance
    let _ = conn.execute("PRAGMA journal_mode = WAL;", []);
    let _ = conn.execute("PRAGMA synchronous = NORMAL;", []);
    let _ = conn.execute("PRAGMA cache_size = -64000;", []); // 64MB cache size
    let _ = conn.execute("PRAGMA temp_store = MEMORY;", []);
    
    // Check if the table exists with `id` as the primary key
    let has_id_pk: Result<String, _> = conn.query_row(
        "SELECT name FROM pragma_table_info('scanned_files') WHERE pk = 1 AND name = 'id'",
        [],
        |row| row.get(0),
    );
    if has_id_pk.is_err() {
        // Drop the old table to upgrade to the new schema
        conn.execute("DROP TABLE IF EXISTS scanned_files", []).ok();
    }
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS scanned_files (
            id TEXT PRIMARY KEY,
            filename TEXT,
            filePath TEXT,
            category TEXT,
            container TEXT,
            sizeGB REAL,
            durationMins REAL,
            year INTEGER,
            videoCodec TEXT,
            videoResolution TEXT,
            videoBitrateMbps REAL,
            audioTracks TEXT,
            subtitleTracks TEXT,
            tags TEXT,
            audioBitrate REAL,
            isCorrupted INTEGER DEFAULT 0,
            errorMessage TEXT,
            hasEmbeddedPoster INTEGER DEFAULT 0,
            bitrateAnomaly INTEGER DEFAULT 0,
            bitrateAnomalyReason TEXT,
            topLevelFolder TEXT,
            streamFriendlyLevel TEXT,
            streamFriendlyReason TEXT,
            streamFriendlySuggestion TEXT,
            streamFriendlyEvaluated INTEGER DEFAULT 0
        )",
        [],
    )?;

    // Add index on filePath to speed up lookups and path-based operations
    let _ = conn.execute("CREATE INDEX IF NOT EXISTS idx_scanned_files_filePath ON scanned_files(filePath);", []);
    
    // Schema upgrades - safe to run sequentially as they will be ignored if the column exists
    let new_columns = vec![
        "videoBitDepth TEXT DEFAULT ''",
        "audioSampleRate INTEGER DEFAULT 0",
        "chapterCount INTEGER DEFAULT 0",
        "rawAudioCodec TEXT DEFAULT ''",
        "physicalAudioChannels INTEGER DEFAULT 0",
        "matchedOnlineId TEXT DEFAULT ''",
        "fileUuid TEXT DEFAULT ''",
        "hasExternalSubtitles INTEGER DEFAULT 0",
        "embeddedSubtitleLanguages TEXT DEFAULT ''",
        "author TEXT DEFAULT ''",
        "narrator TEXT DEFAULT ''",
        "publisher TEXT DEFAULT ''",
        "bookSeries TEXT DEFAULT ''",
        "seriesIndex REAL DEFAULT 0",
        "isbn TEXT DEFAULT ''",
        "pageCount INTEGER DEFAULT 0",
        "videoFrameRate REAL DEFAULT 0"
    ];

    for col_def in new_columns {
        let _ = conn.execute(
            &format!("ALTER TABLE scanned_files ADD COLUMN {}", col_def),
            [],
        );
    }
    
    Ok(conn)
}
