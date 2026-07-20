use rusqlite::{Connection, Result};
use std::path::PathBuf;

pub fn init_db(data_dir: &PathBuf) -> Result<Connection> {
    let db_dir = data_dir.join("BitScribeDB");
    std::fs::create_dir_all(&db_dir).ok();
    let db_path = db_dir.join("steward.db");
    
    let conn = Connection::open(db_path)?;
    
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
        "pageCount INTEGER DEFAULT 0"
    ];

    for col_def in new_columns {
        let _ = conn.execute(
            &format!("ALTER TABLE scanned_files ADD COLUMN {}", col_def),
            [],
        );
    }
    
    Ok(conn)
}
