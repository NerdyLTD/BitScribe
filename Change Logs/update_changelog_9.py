with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Product Tour Script Update:**
  - **Details:**
    - Updated slide 7 text from "Currently Active Scan Mode" to "Active Scan Mode" for brevity.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
