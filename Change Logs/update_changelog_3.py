with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Metrics Dashboard Layout & Terminology Refactor:**
  - **Context:**
    - Performed a layout refinement on the metrics dashboard to optimize use of available space and better align the layout structure for custom metric selection. The "Video Stream Audit" was renamed to "Streaming Readiness" to better communicate its diagnostic intent.
  - **Details:**
    - Reduced `metadata-completeness-card` width to 1/4 (`lg:col-span-1`).
    - Reduced `missing-metadata-card` width to 3/4 (`lg:col-span-3`).
    - Exchanged Row 3 and Row 5 to place the `metadata-completeness-card` and `missing-metadata-card` on Row 3, and `media-duplicates-card` on Row 5.
    - Reordered the `ProductTour.tsx` steps and `App.tsx` Tour target arrays to seamlessly map the newly adjusted visual layout.
    - Updated text labels from "Video Stream Audit" to "Streaming Readiness" in all UI components and dropdown menus.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
