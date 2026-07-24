const fs = require('fs');
const content = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const target = `                onAppReset={() => {
                  setConfirmAction({
                    message: "Warning: Are you sure you want to COMPLETELY WIPE your app state, paths, settings, and database? This cannot be undone.",
                    onConfirm: () => {
                      localStorage.clear();
                      clearDb().then(() => {
                    setScannedFiles([]);
                    setScannedFilesList([]);
                    setCorruptFiles([]);
                    setScanLogs(["App state and database completely wiped."]);
                  }).catch(() => {
                    setScannedFiles([]);
                    setScannedFilesList([]);
                  });
                    }
                  });
                }}`;

const replacement = `                onAppReset={() => {
                  setConfirmAction({
                    message: "Warning: Are you sure you want to COMPLETELY WIPE your app state, paths, settings, and database? This cannot be undone.",
                    onConfirm: () => {
                      setIsAppResetting(true);
                    }
                  });
                }}`;

if (content.includes(target)) {
  fs.writeFileSync('apps/steward/src/App.tsx', content.replace(target, replacement));
  console.log("Patched onAppReset");
} else {
  console.log("Could not find target block");
}
