with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Metrics Filter Z-Index & Bleed Fix (Portal Reverted):**
  - **Context:**
    - The previous React Portal approach caused the Metrics filter to unintentionally persist on all tabs (Help, Options) because it was lifted out of the tab conditional rendering tree. 
    - The root cause of the "bleeding cards" issue before the portal was that `top-0` positioning inside a padded scroll container (`p-4`) combined with negative margin (`-mt-4`) left a transparent 16px padding gap where scrolling cards were visible above the filter's background.
  - **Details:**
    - Reverted the React Portal implementation in `App.tsx` and `Dashboard.tsx`, restoring the filter to its original location within the `Dashboard` tree.
    - Removed `pt-4` from the main scroll container in `App.tsx` and pushed the padding down to individual tab components.
    - Removed the negative top margin (`-mt-4`) from the Metrics Filter wrapper, allowing its `bg-[#0F1117]` to cover its own padding fully. This completely seals the 16px gap, preventing any cards from bleeding through when scrolling up, while still adhering seamlessly to the tab bar.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
