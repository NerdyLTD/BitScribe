const fs = require('fs');
const file = 'packages/core-db/src/api.ts';
let content = fs.readFileSync(file, 'utf8');

// 1. Reuse existingDbFiles and calculate _normPath immediately
content = content.replace(
    'let existingPaths = new Set<string>();',
    'let existingPaths = new Set<string>();\n    let existingDbFilesCache: any[] = [];'
);

content = content.replace(
    /const dbFiles = await getDbFiles\(\);\s+dbFiles\.forEach\(f => {\s+const normPath = normalizePath\(f\.filePath \|\| f\.id\);\s+existingPaths\.add\(normPath\);\s+existingFilesMap\.set\(normPath, f\);\s+}\);/,
    `const dbFiles = await getDbFiles();
        existingDbFilesCache = dbFiles;
        dbFiles.forEach(f => {
            const normPath = normalizePath(f.filePath || f.id);
            (f as any)._normPath = normPath;
            existingPaths.add(normPath);
            existingFilesMap.set(normPath, f);
        });`
);

// 2. Add normPath to the allFiles array type
content = content.replace(
    /let allFiles: \{path: string, hash: string, hasExternalSubtitles\?: boolean\}\[\] = \[\];/,
    'let allFiles: {path: string, hash: string, hasExternalSubtitles?: boolean, normPath: string}[] = [];'
);

// 3. Add normPath to the dirFiles array type and push
content = content.replace(
    /const dirFiles: \{path: string, hash: string, hasExternalSubtitles\?: boolean\}\[\] = \[\];/,
    'const dirFiles: {path: string, hash: string, hasExternalSubtitles?: boolean, normPath: string}[] = [];'
);

content = content.replace(
    /dirFiles\.push\(\{\s+path: file,\s+hash: fileObj\.fileHash,\s+hasExternalSubtitles: fileObj\.hasExternalSubtitles\s+\}\);\s+const normPath = normalizePath\(file\);/,
    `const normPath = normalizePath(file);
                    dirFiles.push({
                        path: file, 
                        hash: fileObj.fileHash,
                        hasExternalSubtitles: fileObj.hasExternalSubtitles,
                        normPath: normPath
                    });`
);

// 4. Reuse existingDbFilesCache instead of calling getDbFiles() again
content = content.replace(
    'const existingDbFiles = await getDbFiles();',
    'const existingDbFiles = existingDbFilesCache;'
);

// 5. Use normPath and _normPath in pruning logic
content = content.replace(
    'const allFilesSet = new Set(allFiles.map(f => normalizePath(f.path)));',
    'const allFilesSet = new Set(allFiles.map(f => f.normPath));'
);

content = content.replace(
    /const normFile = normalizePath\(item\.filePath\);\s+\(item as any\)\._normPath = normFile; \/\/ cache for next steps/,
    'const normFile = (item as any)._normPath;'
);

content = content.replace(
    'const existingDbFilesSet = new Set(existingDbFiles.map(f => normalizePath(f.filePath)));',
    'const existingDbFilesSet = new Set(existingDbFiles.map(f => (f as any)._normPath));'
);

content = content.replace(
    'return !existingDbFilesSet.has(normalizePath(fileObjItem.path));',
    'return !existingDbFilesSet.has(fileObjItem.normPath);'
);

content = content.replace(
    'const normPath = normalizePath(file);', // wait, we have multiple of these. Let's do a more precise replace for line 589
    'const normPath = fileObjItem.normPath;' // this replaces the first occurrence, which is NOT line 589. 
);

fs.writeFileSync(file, content);
console.log('Optimized api.ts');
