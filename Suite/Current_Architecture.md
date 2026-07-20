# Current Architectural Design: BitScribe Steward (Standalone)

## 1. Overview
Currently, BitScribe Steward is a monolithic desktop application built with the Tauri framework. It relies on a React/TypeScript frontend for user interaction, configuration, and reporting, and a Rust backend for high-performance file system operations and database management.

## 2. Structural Layers

### A. Presentation / Frontend (React + Vite + Tailwind CSS)
- **Primary View (`src/App.tsx`)**: Acts as the central state manager and UI orchestrator. Handles file selection, profile generation, report initiation, and rendering the dashboard.
- **Components (`src/components/`)**:
  - `Dashboard.tsx`: Visualizes scan metrics and summaries.
  - `RuleEditor.tsx`: Manages custom scan rules and configuration profiles.
  - `HelpSection.tsx`: Documentation and user guidance.
- **Styling**: Tailwind CSS is used globally for all responsive UI and components.

### B. Core Business Logic (TypeScript)
- **Evaluators (`src/utils/plexEvaluator.ts`, `duplicateHelper.ts`)**: The brain of the auditing process. Contains the logic for determining streaming compatibility, anomaly detection, and duplicate flagging based on user-defined `RuleCriteria`.
- **Exporters (`src/utils/excelExporter.ts`, `reportExporter.ts`)**: Handles the generation of complex, standalone HTML, CSV, and Excel reports. The HTML exporter injects a reactive UI directly into the output file.
- **API Bridge (`src/lib/api.ts`)**: Uses Tauri's IPC (Inter-Process Communication) to communicate with the Rust backend. Includes a mock database fallback for non-Tauri environments (like web previews).

### C. Backend & System Access (Rust - `src-tauri/`)
- **File System Operations (`lib.rs`)**: Uses `walkdir` to recursively traverse directories and gather file metadata (size, extension, path).
- **Data Persistence (`db.rs`)**: Uses `rusqlite` to manage a local SQLite database (`steward.db`) stored in the `BitScribeDB` folder.
- **Models (`models.rs`)**: Defines the Rust structures representing `ScannedFile` and other domain objects that mirror the TypeScript `MediaItem` interfaces.

## 3. Data Flow
1. **Scan Initiation**: The user selects a directory via the Tauri dialog in the React frontend.
2. **Backend Processing**: The Rust backend scans the directory, extracts file info, and inserts the raw records into the SQLite database.
3. **Evaluation**: The React frontend pulls the database records via IPC, evaluates them against the active rule profile (Plex rules, Duplicate rules, Quality rules), and generates `EvaluationResult` objects in memory.
4. **Reporting**: The evaluated data is passed to the Exporters to generate the final artifacts (HTML/Excel/JSON).

## 4. Current Limitations for Expansion
- **Tight Coupling**: The evaluation logic, UI state, and database queries are tightly coupled within the single app structure.
- **Data Silo**: The database is currently managed solely by the Steward app's backend. Another app (like RX) would have to duplicate the Rust database connection logic and TypeScript models.
- **Monolithic Repository**: Adding a new app requires either duplicating the entire codebase into a new repo or awkwardly jamming multiple frontends into a single Tauri configuration.
