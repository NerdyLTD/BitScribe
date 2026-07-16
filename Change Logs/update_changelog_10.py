with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Header Layout Refinement:**
  - **Details:**
    - Repositioned the "Full screen" toggle button under the "Library Inventory" text/metrics to reduce horizontal clutter in the header.
    - Reduced the button's vertical height by half on desktop viewports to maintain a balanced, compact header layout.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
