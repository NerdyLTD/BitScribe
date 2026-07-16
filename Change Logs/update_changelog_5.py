with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **UI Spacing & AC3 Codec Default Enhancements:**
  - **Context:**
    - Unified the spacing on the Help page to match the rest of the application (e.g. Dashboard, Rule Editor) to ensure a consistent visual rhythm. 
    - Resolved a visual glitch on the Dashboard where scrolling cards would bleed through the sticky Metrics Filter block.
    - Added a patch to enforce AC3 as a default enabled stereo codec for existing users loading legacy/modern settings.
  - **Details:**
    - Updated `HelpSection.tsx` padding and margins from `space-y-8`/`gap-6` to tighter `space-y-3`/`gap-3` values.
    - Updated the sticky Metrics Dashboard Filter in `Dashboard.tsx` with a fully opaque container (`bg-[#0F1117]`) and `top-[44px]` positioning so it seamlessly docks under the sticky navigation tabs, hiding any elements scrolling up behind it.
    - Appended an initial startup check in `App.tsx` that ensures "ac3" is pushed to `legacyStereoAudioCodecs` and `modernStereoAudioCodecs` arrays if missing in the user's localized browser storage.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
