# Phase 5: UI Component Isolation & Refactoring Plan

## The Problem
The current frontend components (specifically `Dashboard.tsx` (~130KB) and `RuleEditor.tsx` (~90KB)) have grown into massive monolithic files. They mix business logic, heavy data processing, constant declarations, and complex UI rendering into single files. This makes them brittle, hard to test, and highly susceptible to accidental regressions during updates.

## The Goal
Break down the monolithic React components into small, isolated, reusable, and easily testable sub-components. Separate the data processing logic from the presentation layer. This will permanently mitigate accidental changes and lay the stable groundwork required for the transition to **BitScribe RX**.

## Execution Steps

### 1. Extract Constants & Helpers
- **Constants**: Move massive hardcoded arrays (e.g., `ALL_DISCOVERY_VIDEO`, `ALL_DISCOVERY_SURROUND`, `ALL_DISCOVERY_STEREO` in `RuleEditor.tsx`) to a dedicated constants file in `@bitscribe/core-eval/constants.ts`.
- **Formatters**: Move inline UI formatters (e.g., `formatResolution`, `missingFmt`, `formatSubtitleSummary` in `Dashboard.tsx`) to a shared utility module `@bitscribe/ui-components/formatters.tsx`.

### 2. Isolate Business Logic (Custom Hooks)
- `Dashboard.tsx` currently performs heavy O(N) calculations (anomaly distributions, missing tag checks, duplicate mapping) inside its render body. 
- **Action**: Extract this math into a dedicated hook: `useDashboardMetrics(items, rules)` inside `apps/steward/src/hooks/`. The Dashboard should only receive the finalized data to render.

### 3. Break Down `Dashboard.tsx`
Refactor the 130KB monolith into discrete presentation components within `packages/ui-components/src/dashboard/`:
- `DashboardProgress.tsx`: Handles scan and export progress bars.
- `DashboardMetricsPanel.tsx`: Renders the Recharts distribution graphs and anomaly statistics.
- `DashboardToolbar.tsx`: Handles the search bar, category filters, and pagination controls.
- `MediaRegistryTable.tsx`: Dedicated to rendering the complex virtualized/paginated data grid.

### 4. Break Down `RuleEditor.tsx`
Refactor the 90KB monolith into discrete sections within `packages/ui-components/src/rules/`:
- `PresetsSelector.tsx`: The high-level mode toggles (Stream Audit, Metadata Audit, etc.).
- `CodecSelector.tsx`: Reusable multi-select component for video/audio codecs.
- `ExportSettingsPanel.tsx`: The configuration block for CSV/Excel/HTML exports.
- `AdvancedRulesPanel.tsx`: For granular toggles (bitrate limits, missing sub checks).

### 5. Validation & Mitigation (The Safety Net)
- **Structural Validation**: Implement a validation script (similar to `validate_reports.js`) that runs during the build process to verify critical UI components and data hooks are correctly exported and integrated.
- **Strict Export Contracts**: By moving these pieces into `@bitscribe/ui-components`, any broken imports or missing props will be caught instantly by the TypeScript compiler (`tsc --noEmit`), preventing silent UI regressions from making it into a build.
