with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Product Tour & Dashboard Metrics Row Reordering:**
  - **Context:**
    - Modified the "Select Blocks" dropdown text to accurately read "Select Metrics".
    - Reordered the Media Scanner metrics dashboard layout and product tour steps to follow a strict row-by-row sequence as requested (Library Overview -> Video Stream Audit -> Codecs/Containers -> Metadata Completeness -> Media Duplicates -> Subtitles -> Quality -> Missing Tags).
  - **Details:**
    - Updated `src/components/Dashboard.tsx` to fix the button label.
    - Rearranged the DOM layout of the 11 metric blocks in `src/components/Dashboard.tsx`.
    - Updated the `TOUR_STEP_TARGETS` indices in `src/App.tsx`.
    - Sorted the sequential `TOUR_STEPS` targets in `src/components/ProductTour.tsx`.

"""

# Insert under `## [2026-07-12]`
insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
