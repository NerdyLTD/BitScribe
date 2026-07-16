const fs = require('fs');
let code = fs.readFileSync('src/lib/api.ts', 'utf8');

code = code.replace(
  `                        const currentSizeGB = fileInfo.size / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {`,
  `                        const currentSizeGB = fileInfo.size / (1024 * 1024 * 1024);
                        const storedSizeGB = existingFilesMap.get(file)?.sizeGB || 0;
                        onLog(\`Size check \${file}: current \${currentSizeGB}GB vs stored \${storedSizeGB}GB\`);
                        if (Math.abs(currentSizeGB - storedSizeGB) > 0.001) {`
);

fs.writeFileSync('src/lib/api.ts', code);
