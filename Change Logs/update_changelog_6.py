with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Metrics Filter Sticky Layout Fix:**
  - **Context:**
    - The previous patch to prevent cards from bleeding through the sticky Metrics Filter block accidentally introduced a 44px gap between the navigation tabs and the filter, which caused the filter to float over and partially hide the top row of metrics cards.
  - **Details:**
    - Corrected the `top-[44px]` positioning to `top-0` on the sticky wrapper in `Dashboard.tsx`. Since the sticky container is inside a scrolling `div` that sits directly below the header tabs, `top-0` correctly anchors it to the top of the scroll port.
    - Adjusted the wrapper margins (`-mt-4 pt-4`) to perfectly neutralize the scroll container's `p-4` padding, ensuring a seamless edge-to-edge opaque background (`bg-[#0F1117]`) that hides cards before they scroll into the padded area.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
