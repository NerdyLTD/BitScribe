const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

if (!code.includes('import { stat }')) {
  code = `import { stat } from '@tauri-apps/plugin-fs';\n` + code;
}

code = code.replace(
  `    let existingPaths = new Set<string>();
    if (isResume) {`,
  `    let existingPaths = new Set<string>();
    let existingFilesMap = new Map<string, any>();
    if (isResume) {`
);

code = code.replace(
  `            dbFiles.forEach(f => existingPaths.add(f.filePath || f.id));`,
  `            dbFiles.forEach(f => {
                existingPaths.add(f.filePath || f.id);
                existingFilesMap.set(f.filePath || f.id, f);
            });`
);

code = code.replace(
  `            if (existingPaths.has(file)) {
                onProgress({ current: i + 1, total: allFiles.length, item: null });
                continue;
            }`,
  `            let skipFile = false;
            if (existingPaths.has(file)) {
                if (isResume) {
                    try {
                        const fileInfo = await stat(file);
                        const currentSizeGB = fileInfo.size / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {
                            skipFile = false;
                        } else {
                            skipFile = true;
                        }
                    } catch (err) {
                        skipFile = true;
                    }
                } else {
                    skipFile = true;
                }
            }

            if (skipFile) {
                onProgress({ current: i + 1, total: allFiles.length, item: null });
                continue;
            }`
);

fs.writeFileSync('src/lib/api.ts', code);
console.log('Fixed api.ts');
