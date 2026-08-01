# Agent Operating Rules

## Mission
Make focused, minimal, and safe changes in this repository. Preserve existing fixes, performance work, and user assets.

## Non-Negotiable Rules
- Never overwrite a tracked file without first verifying the exact source path, destination path, and current working directory.
- Never use shell redirection or in-place text replacement to modify tracked source files unless the workflow writes to a temp file first and then renames it atomically.
- Never use patterns like `cat source > source`, `echo ... > tracked-file`, or any command that can truncate a file before content is safely written.
- Never use `sed -i`, recursive replacement scripts, or broad repo-wide text replacements on tracked files.
- Never modify binary or graphics assets as text.
- Never touch protected assets unless explicitly requested.
- Push changes only to the `tauri` branch.

## Safe Edit Workflow
1. Inspect the target file and confirm the intended path.
2. Check the current working directory and resolve source and destination paths.
3. Confirm source and destination are not the same file.
4. Write changes to a temp file in the same directory.
5. Verify temp file size and contents before replacing anything.
6. Rename the temp file into place atomically.
7. Re-open the final file and confirm it is non-empty and contains the expected symbols.

## Stop Conditions
- Stop immediately if a file becomes empty or unexpectedly small.
- Stop if a command would write to a path that has not been re-checked.
- Stop if the change affects more files than intended.
- Stop and ask before any potentially destructive file operation.

## Change Discipline
- Preserve prior fixes, performance improvements, and UX enhancements unless a regression-free alternative is intentionally approved.
- Review existing history and changelog context before editing.
- Update the changelog when significant fixes or behavioral changes are made.
- Provide a brief summary of actions taken after changes.

## Performance Constraints

- Preserve the current Library tab performance model:
  - one category at a time only,
  - paginated display by default,
  - no “Show All” or equivalent unbounded page-size option.

- Preserve bounded scan behavior:
  - keep the scan log buffer capped,
  - do not remove or loosen throttling without a clear performance reason,
  - do not let scan UI updates devolve into unbounded render churn.

- Preserve lazy derived-data handling:
  - keep expensive secondary sort data computed lazily,
  - do not move parsing or extraction into the initial full-item mapping loop,
  - do not precompute deep metadata for every item unless explicitly justified.

- Treat these behaviors as intentional performance guards, not incidental implementation details.

- Do not “simplify” or refactor away these protections unless the change is explicitly approved and accompanied by a regression-safe replacement.

- If a future change affects list rendering, filtering, scanning, sorting, or page sizing, verify that these constraints still hold before merging.