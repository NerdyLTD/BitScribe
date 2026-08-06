# Proposed Architectural Design: BitScribe Suite

## 1. Overview
To support multiple interconnected applications (BitScribe Steward, BitScribe RX, BitScribe Library/Books), the architecture will transition from a standalone monolith to a **Monorepo / Modular Suite**. This allows apps to share core libraries, evaluation rules, and database schemas while maintaining independent interfaces and executables.

## 2. Structural Layers & Monorepo Layout
We will adopt a workspace-based monorepo (e.g., using `npm workspaces` or `Turborepo`).

```text
bitscribe-suite/
├── packages/
│   ├── core-types/       # Shared TypeScript interfaces (MediaItem, RuleCriteria)
│   ├── core-eval/        # Shared logic (plexEvaluator, duplicateHelper, parsers)
│   ├── core-db/          # Shared database schema definitions and basic queries
│   └── ui-components/    # Shared React components (Buttons, Panels, RuleEditor)
├── apps/
│   ├── steward/          # The current audit and reporting app
│   ├── rx/               # The active remediation and modification app
│   └── library/          # The proposed eBook / Audiobook consumption app
```

## 3. Application Roles

### A. BitScribe Steward (The Auditor)
- **Primary Role**: Read-only scanning, analysis, and report generation.
- **Actions**: Scans directories, evaluates files against strict compatibility rules, updates the shared SQLite database with file statuses, and exports Excel/HTML reports.

### B. BitScribe RX (The Healer/Remediator)
- **Primary Role**: Active file modification, organization, and metadata injection.
- **Actions**: Reads the database created by Steward. Executes FFmpeg remuxing/transcoding, renames files dynamically based on tags, moves files to standardize folder structures, and writes embedded metadata tags directly into containers.
- **Write-Back**: Updates the shared database immediately upon successfully altering a file, ensuring Steward doesn't need to re-scan.

### C. BitScribe Library (Audiobooks & eBooks)
- **Primary Role**: Consumption, organization, and metadata fetching for literature.
- **Actions**: Specialized handling for `.epub`, `.pdf`, `.m4b`, `.mp3` audiobooks. Focuses on Chapter extraction, Author/Series grouping, and reading progress tracking. Could be standalone or a module within RX, but an independent app allows for a cleaner, specialized UI.

## 4. Shared Data Model (The Suite Database)
- **Database Location**: A universal `BitScribeDB` folder, portable and relative to the executable (e.g., stored on the USB drive next to the apps).
- **Concurrent Access**: Since SQLite supports concurrent reads (and sequential writes via WAL mode), multiple BitScribe apps can safely read the database simultaneously.
- **Schema Enhancements**: The database will be expanded to include UUIDs/Hashes (to track files even when RX renames them), detailed audio/video stream parameters, and remediation status flags.

## 5. Deployment & Execution Models (Addressing the FAQ)

### A. Portable Executable (USB / Network Share)
- **How it works**: Tauri compiles the apps into standalone binaries (`.exe`, `.app`, `.AppImage`).
- **Data Strategy**: By configuring the SQLite connection string to look for `./BitScribeDB` relative to the executable's current working directory (instead of the OS AppData folder), the entire suite and database becomes portable on a USB stick or network drive.

### B. Docker / LXC / VM Version
- **The Challenge**: Tauri is a desktop framework relying on the OS's native webview. It cannot run natively in a headless Docker container without a virtual display.
- **The Solution (Future Web Mode)**: Because we are moving core logic to `packages/core-*`, we can easily build a new entry point in `apps/server`. This would be a lightweight Node.js/Rust web server that serves the React frontend over HTTP and exposes the Rust file-system operations via REST/WebSocket APIs.
- **Result**: Users can spin up BitScribe via `docker-compose`, map their media volumes, and access the UI from any web browser on their network.

## 6. Migration Strategy (Avoiding Disruption)
- **Is this destructive?** No. We do not need to pause or destroy the current release.
- **Phase 1 (Immediate Release)**: Release the current standalone codebase as **BitScribe Steward V1**.
- **Phase 2 (Monorepo Conversion)**: In a new branch (or separate repo), migrate the V1 codebase into the `apps/steward` folder of a new monorepo. Extract the shared logic into `packages/`.
- **Phase 3 (Develop RX)**: Build BitScribe RX alongside Steward in the monorepo, utilizing the shared packages.
