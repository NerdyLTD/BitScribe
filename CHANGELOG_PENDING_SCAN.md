# Changelog: Pending Scan Implementation

This log tracks all precise changes made to support the "Pending Scan" status for files unevaluated by the Streaming compatibility scanner.

## 1. Database Schema & Migration Changes
* **File:** `/server.ts`
* **Changes:**
  * Updated `CREATE TABLE IF NOT EXISTS scanned_files` to include `streamFriendlyEvaluated INTEGER DEFAULT 0`.
  * Added dynamic SQLite migration command: `ALTER TABLE scanned_files ADD COLUMN streamFriendlyEvaluated INTEGER DEFAULT 0` to safely patch existing databases.

## 2. Server Scan & Seed Modifications
* **File:** `/server.ts`
* **Changes:**
  * Updated `/api/demo-data` endpoint to seed a 60/40 blend of scanned and unscanned media. Scanned media (60%) are pre-evaluated using `evaluateStreamFriendliness` with default rules and marked as `streamFriendlyEvaluated: 1`, while unscanned media (40%) are seeded with empty streaming fields and marked as `streamFriendlyEvaluated: 0`.
  * Updated the mock scan fallback loop in `/api/scan` to evaluate and store the correct `streamFriendlyEvaluated` value (`0` for Discovery scan, `1` for standard Streaming scans) along with evaluated levels, so subsequent scans update the client correctly.
  * Updated `/api/db-files` mapping to retrieve and return `streamFriendlyEvaluated: row.streamFriendlyEvaluated || 0` to clients.
  * Updated `saveScannedFile` SQL query and inputs to store `item.streamFriendlyEvaluated`.
  * Integrated `streamFriendlyEvaluated: activeRules.useDiscoveryPreset ? 0 : 1` inside the worker scanning loop to set evaluated status only when running a standard compatibility scan.
  * Added instant evaluation and database write inside the cache-hit block of the worker loop if a cached file's evaluation status is currently pending (`streamFriendlyEvaluated !== 1`) and standard streaming presets are selected (`useDiscoveryPreset !== true`).

## 3. Global Types & Interfaces Definition
* **File:** `/src/types.ts`
* **Changes:**
  * Added `streamFriendlyEvaluated?: number;` attribute to the `MediaItem` interface.
  * Added `'pending'` to the `PlexFriendlyLevel` union type definition.

## 4. Evaluator Rules Bypass
* **File:** `/src/utils/plexEvaluator.ts`
* **Changes:**
  * Added `PlexFriendlyLevel` to the `import` statements.
  * Added check at the beginning of `evaluatePlexCompatibility`:
    * If `item.streamFriendlyEvaluated === 0`, return `'pending'` level with standard explanations.
    * If `item.streamFriendlyEvaluated === 1` and a `streamFriendlyLevel` exists, bypass dynamic checking and return the database-stored compatibility level directly.

## 5. UI and Export Alignment
* **File:** `/src/components/Dashboard.tsx`
* **Changes:**
  * Changed label returned by `getCompatibilityLabel` for `'pending'` level from `"Pending Audit"` to `"Pending Scan"`.
  * Updated `getCompatibilityTooltip` for `'pending'` level from `"Pending Audit: ..."` to `"Pending Scan: Run the Streaming compatibility scanner to evaluate streaming compatibility."`.
* **File:** `/src/utils/reportExporter.ts`
* **Changes:**
  * Updated `getCompatibilityLabel` inside `exportMediaLibraryToCSV` and `exportMediaLibraryToHTML` to handle `'pending'` level and return `"Pending Scan"`.
* **File:** `/src/utils/excelExporter.ts`
* **Changes:**
  * Updated `getCompatibilityLabel` inside `exportMediaLibraryToExcel` to handle `'pending'` level and return `"Pending Scan"`.
