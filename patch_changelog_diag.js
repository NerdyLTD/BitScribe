const fs = require('fs');
let file = fs.readFileSync('CHANGELOG.md', 'utf8');

const newEntry = `
### Added
- **Diagnostic Logging Toggle**: Added a new global option in the Rule Editor to enable diagnostic logging. When enabled, the app immediately begins capturing application lifecycle events to a timestamped \`_debuglog.txt\` in the configured Export Directory upon subsequent launches, ensuring complete startup captures.

### Fixed
- **App Startup Crash & Error Handling**: Fixed a critical bug causing the application to render a persistent black screen on startup. Implemented a top-level React \`ErrorBoundary\` in \`main.tsx\` to catch and visibly display any future unhandled React crashes, rather than silently failing and trapping the user on a blank screen.
`;

file = file.replace(/### Added/, newEntry.trim() + '\\n\\n### Added');
fs.writeFileSync('CHANGELOG.md', file);
