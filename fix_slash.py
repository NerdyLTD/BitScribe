with open('packages/core-db/src/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("p.lastIndexOf('\\')", "p.lastIndexOf('\\\\')")
content = content.replace("filePath.replace(/\\/g, '/')", "filePath.replace(/\\\\/g, '/')")
content = content.replace("p.replace(/\\/g, '/')", "p.replace(/\\\\/g, '/')")

with open('packages/core-db/src/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)

