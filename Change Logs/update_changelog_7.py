with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Metrics Filter Permanent Placement & Bitsy Redesign:**
  - **Context:**
    - The Metrics Filter block continued to struggle with z-index scrolling issues and visual gaps under the tab bar. Since the filter is meant to be persistently visible, it has been permanently relocated into a fixed portal directly beneath the tabs (outside the scrollable page body).
    - Bitsy's initial design had low contrast, causing her eyelashes and facial features to blend into the dark background of her main body.
  - **Details:**
    - Established a React Portal (`#dashboard-filter-portal-target`) directly under the tab header in `App.tsx` and updated `Dashboard.tsx` to render the filter block into it.
    - Removed `sticky`, `z-index`, and negative margin CSS hacks from the filter wrapper now that it sits natively outside the overflow container.
    - Redesigned Bitsy's SVG character (`BitsyCharacter.tsx`) to resemble a true film clapperboard: changed the main body fill from `#1e232e` to bright `#ffffff`, added authentic subtle divider lines, and transformed the top clapper bar into a colorful rainbow pattern (black, green, yellow, blue, red) using SVG clip-paths.
    - Updated Bitsy's mouth stroke color to `#1e232e` for maximum contrast against her new white body.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
