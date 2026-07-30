const fs = require('fs');
const file = 'packages/core-db/src/api.ts';
let content = fs.readFileSync(file, 'utf8');

const newFunctions = `
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

    const parts = normFile.split('/').filter(p => p);
    if (parts.length === 0) return "Unknown";
    return parts.length > 1 ? parts[0] : "Root";
}
`;

const getTopLevelRegex = /function getTopLevelFolder.*?return parts\.length > 1 \? parts\[0\] : "Root";\n\}/s;
content = content.replace(getTopLevelRegex, newFunctions.trim());

content = content.replace(/const base = f\.replace\(\/\\\\\\\/g, '\/'\)\.split\('\/'\)\.pop\(\);/g, 'const base = fastBasename(f);');
content = content.replace(/const gfBasename = gf\.filename \|\| gf\.filePath\.replace\(\/\\\\\\\/g, '\/'\)\.split\('\/'\)\.pop\(\) \|\| "";/g, 'const gfBasename = gf.filename || fastBasename(gf.filePath) || "";');
content = content.replace(/const ghostBasenames = new Set\(ghostFiles\.map\(gf => \(gf\.filename \|\| gf\.filePath\.replace\(\/\\\\\\\/g, '\/'\)\.split\('\/'\)\.pop\(\) \|\| ""\)\.toLowerCase\(\)\)\);/g, 'const ghostBasenames = new Set(ghostFiles.map(gf => (gf.filename || fastBasename(gf.filePath) || "").toLowerCase()));');
content = content.replace(/const nfBasename = nf\.replace\(\/\\\\\\\/g, '\/'\)\.split\('\/'\)\.pop\(\) \|\| "";/g, 'const nfBasename = fastBasename(nf) || "";');

fs.writeFileSync(file, content);
