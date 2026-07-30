import re

with open('packages/core-db/src/api.ts', 'r', encoding='utf-8') as f:
    content = f.read()

new_functions = """
// Fast basename helper to prevent regex and split allocations during loops
function fastBasename(p: string): string {
    const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\\\'));
    return lastSlash !== -1 ? p.substring(lastSlash + 1) : p;
}

// Global cache for configured paths normalization
const _topLevelPathCache = new Map<string, { normBase: string, normBaseLower: string }>();

function getTopLevelFolder(filePath: string, configuredPaths?: string[]): string {
    if (!filePath) return "Unknown";
    const normFile = filePath.replace(/\\\\/g, '/');
    const normFileLower = normFile.toLowerCase();
    
    if (configuredPaths && configuredPaths.length > 0) {
        let matchingBase = "";
        for (const p of configuredPaths) {
            let cached = _topLevelPathCache.get(p);
            if (!cached) {
                const normBase = p.replace(/\\\\/g, '/');
                cached = { normBase, normBaseLower: normBase.toLowerCase() };
                _topLevelPathCache.set(p, cached);
            }
            if (normFileLower.startsWith(cached.normBaseLower)) {
                if (cached.normBase.length > matchingBase.length) {
                    matchingBase = cached.normBase;
                }
            }
        }
        
        if (matchingBase) {
            let relativePath = normFile.substring(matchingBase.length);
            if (relativePath.startsWith('/')) relativePath = relativePath.substring(1);
            const parts = relativePath.split('/').filter(p => p);
            if (parts.length > 1) {
                return parts[0];
            } else {
                return "Root";
            }
        }
    }
"""

# Replace from `function getTopLevelFolder(filePath: string, configuredPaths?: string[]): string {` 
# up to `const parts = normFile.split('/').filter(p => p);`

pattern = r'function getTopLevelFolder\(filePath: string, configuredPaths\?: string\[\]\): string \{.*?(?=const parts = normFile\.split\(\'/\'\)\.filter\(p => p\);)'
content = re.sub(pattern, new_functions.strip() + "\n\n    ", content, flags=re.DOTALL)

with open('packages/core-db/src/api.ts', 'w', encoding='utf-8') as f:
    f.write(content)
