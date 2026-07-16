with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Dropdown and Filter Enhancements:**
  - **Context:**
    - Adjusted the hover highlight color for all custom dropdown menus (Metrics Select, Columns Toggle, Custom Fields) to be lighter for better visibility against dark backgrounds. Also locked the Metrics Dashboard Filter in place during scrolling, and unified the dropdown click-away behavior.
  - **Details:**
    - Updated `hover:bg-slate-800` (and similar dark variants) to `hover:bg-slate-700` inside `Dashboard.tsx`, `App.tsx`, and `RuleEditor.tsx` to provide higher contrast when hovering over dropdown list items.
    - Added `sticky top-0 z-[45] backdrop-blur-md bg-[#14171F]/95` to the `#metrics-dashboard-filter` in `Dashboard.tsx` to lock it at the top of the viewport when scrolling.
    - Implemented a `useRef` and `mousedown` event listener to automatically collapse the "Select Metrics" dropdown in `Dashboard.tsx` when clicking away, bringing its behavior in line with native `<select>` dropdowns found on the Library page. Implemented the same fix for the "Custom Fields" popover in `App.tsx`.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
