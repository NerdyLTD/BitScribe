# Workflow and Fix Standards

To prevent regression and ensure a stable iterative process, all agents must adhere to the following standards:

1. **Document Fixes Contextually:** When a problem is fixed and verified, document what was fixed and the specific context or problem it was meant to solve. Maintain this context in code comments where applicable.

2. **Review Change History:** When implementing new features or fixing subsequent problems, always review previous changes and their rationale to ensure new work does not discard or overwrite previous improvements.

3. **Preserve Performance Optimizations:** If performance improvements (e.g., worker pools, chunked processing, dynamic batching) or UX enhancements (e.g., detailed progress logs, specific status messages) are present in the code, they must be preserved during refactoring. Do not regress to simpler, slower implementations without explicit prior justification and permission.

4. **Maintain a Project Changelog:** Every agent must log significant fixes and feature updates in a `CHANGELOG.md` file in the root directory. This log must include the exact problem solved, the files modified, and the rationale for the fix to prevent regressions.

5. **Always Read the Changelog First:** Before beginning any implementation or modification, agents MUST read the `CHANGELOG.md` file to understand the history of fixes and ensure they do not revert or break previously solved problems.

6. **Provide Action Summaries:** Always provide a brief summary to the user outlining what actions were taken in terms of modifying the app or applying their requested changes. This ensures the user is kept informed of the work completed.

7. **Verify All Pipeline Mapping Endpoints (Anti-Regression):** When modifying category groups, item classifications, or any data structural mapping (e.g., reclassifying docuseries, specials, or custom categories), agents **MUST** audit every output channel. This includes checking:
   - The UI Dashboard (React components and column layout builders).
   - The Excel generator (`excelExporter.ts`) row assignments and headers.
   - The HTML, CSV, and other report exporters (`reportExporter.ts` and related).
   Ensure that critical string fields like `Title` vs. `Series Title`, or `Release Year` vs. `Year` match the category layout criteria identically so no column is left blank or silently omitted.

8. **Never Modify or Overwrite PayPal QR Code Assets (CRITICAL PROTECTION):** The PayPal QR code files (`src/assets/paypal_qr.png` and `src/assets/paypal_qr_backup_DO_NOT_DELETE.png`) are authentic, production-ready assets containing the user's real payment QR code. Under no circumstances may any agent delete, regenerate, modify, compress, or overwrite these files. They must be preserved exactly as they are. Any automated script, image-generation tool, or manual file replacement must strictly exclude these files.


