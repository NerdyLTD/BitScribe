const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  `        const files = isTauri() ? await invoke<string[]>("walk_dir", { path: p }) : [];
        let validCount = 0;
        for (const file of files) {
            const lower = file.toLowerCase();
            if (allowedExtensions.some(ext => lower.endsWith(ext))) {
                allFiles.push(file);
                validCount++;
            }
        }`,
  `        const files = isTauri() ? await invoke<{path: string, size: number}[]>("walk_dir", { path: p }) : [];
        let validCount = 0;
        for (const fileObj of files) {
            const file = fileObj.path;
            const lower = file.toLowerCase();
            if (allowedExtensions.some(ext => lower.endsWith(ext))) {
                allFiles.push(file);
                // Temporarily store the physical size in the map so we can use it later
                existingFilesMap.set(file + "_physical_size", fileObj.size);
                validCount++;
            }
        }`
);

code = code.replace(
  `                    try {
                        const fileInfo = await stat(file);
                        const currentSizeGB = fileInfo.size / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;
                        onLog(\`Size check \${file}: current \${currentSizeGB}GB vs stored \${storedSizeGB}GB\`);
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {
                            skipFile = false;
                        } else {
                            skipFile = true;
                        }
                    } catch (err) {
                        skipFile = true;
                    }`,
  `                    try {
                        const physicalSize = existingFilesMap.get(file + "_physical_size");
                        const currentSizeGB = (physicalSize || 0) / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;
                        
                        // We check difference up to 1MB
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {
                            skipFile = false;
                            onLog(\`Change detected for \${file}: Size changed from \${storedSizeGB.toFixed(3)}GB to \${currentSizeGB.toFixed(3)}GB.\`);
                        } else {
                            skipFile = true;
                        }
                    } catch (err) {
                        skipFile = true;
                    }`
);

fs.writeFileSync('src/lib/api.ts', code);
console.log('Fixed api.ts');
