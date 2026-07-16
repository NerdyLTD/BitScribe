const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  `    let existingPaths = new Set<string>();
    let existingFilesMap = new Map<string, any>();
    if (isResume) {`,
  `    const normalizePath = (pStr: string) => {
        if (!pStr) return "";
        return pStr.replace(/\\\\/g, '/').toLowerCase().trim();
    };

    let existingPaths = new Set<string>();
    let existingFilesMap = new Map<string, any>();
    if (isResume) {`
);

code = code.replace(
  `            const normalizePath = (pStr: string) => {
                if (!pStr) return "";
                return pStr.replace(/\\\\/g, '/').toLowerCase().trim();
            };`,
  ``
);

code = code.replace(
  `            dbFiles.forEach(f => {
                existingPaths.add(f.filePath || f.id);
                existingFilesMap.set(f.filePath || f.id, f);
            });`,
  `            dbFiles.forEach(f => {
                const normPath = normalizePath(f.filePath || f.id);
                existingPaths.add(normPath);
                existingFilesMap.set(normPath, f);
            });`
);

code = code.replace(
  `        for (const fileObj of files) {
            const file = fileObj.path;
            const lower = file.toLowerCase();
            if (allowedExtensions.some(ext => lower.endsWith(ext))) {
                allFiles.push(file);
                // Temporarily store the physical size in the map so we can use it later
                existingFilesMap.set(file + "_physical_size", fileObj.size);
                validCount++;
            }
        }`,
  `        for (const fileObj of files) {
            const file = fileObj.path;
            const lower = file.toLowerCase();
            if (allowedExtensions.some(ext => lower.endsWith(ext))) {
                allFiles.push(file);
                const normPath = normalizePath(file);
                // Temporarily store the physical size in the map so we can use it later
                existingFilesMap.set(normPath + "_physical_size", fileObj.size);
                validCount++;
            }
        }`
);

code = code.replace(
  `            let skipFile = false;
            if (existingPaths.has(file)) {
                if (isResume) {
                    try {
                        const physicalSize = existingFilesMap.get(file + "_physical_size");
                        const currentSizeGB = (physicalSize || 0) / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;`,
  `            let skipFile = false;
            const normPath = normalizePath(file);
            if (existingPaths.has(normPath)) {
                if (isResume) {
                    try {
                        const physicalSize = existingFilesMap.get(normPath + "_physical_size");
                        const currentSizeGB = (physicalSize || 0) / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(normPath)?.sizeGB || 0;`
);

fs.writeFileSync('src/lib/api.ts', code);
console.log('Fixed api.ts');
