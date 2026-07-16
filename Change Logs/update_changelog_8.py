with open('CHANGELOG.md', 'r') as f:
    content = f.read()

new_log = """- **Bitsy Tour Script Update:**
  - **Details:**
    - Shortened the dialogue on slide 4 to just say "Let's continue" instead of "Let's restore the default and continue" to make it more concise.

"""

insert_idx = content.find('## [2026-07-12]')
insert_idx = content.find('\n', insert_idx) + 1

new_content = content[:insert_idx] + new_log + content[insert_idx:]

with open('CHANGELOG.md', 'w') as f:
    f.write(new_content)
print("CHANGELOG updated")
