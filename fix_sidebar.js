const fs = require('fs');
let content = fs.readFileSync('packages/ui-components/src/Sidebar.tsx', 'utf8');

content = content.replace(
  "  setHasCompletedScan: (val: boolean) => void;\n}",
  "  setHasCompletedScan: (val: boolean) => void;\n  onPopulateDemo?: () => void;\n}"
);

content = content.replace(
  "  setHasCompletedScan,\n}) => {",
  "  setHasCompletedScan,\n  onPopulateDemo,\n}) => {"
);

// We need to replace the injectDemoData block with onPopulateDemo
const oldBlock = `                  if (scannedFilesList.length < 5) {
                    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
                    localStorage.setItem("bitscribe_demo_data_inserted", "true");
                    injectDemoData().then(async () => {
                      try {
                        const newFiles = await getDbFiles();
                        const cleanFiles = newFiles.filter((f: any) => f.category !== "Corrupted" && (!f.category || !f.category.toLowerCase().includes("corrupt")));
                        const corrupt = newFiles.filter((f: any) => f.category === "Corrupted" || (f.category && f.category.toLowerCase().includes("corrupt")));
                        setScannedFiles(cleanFiles);
                        setScannedFilesList(cleanFiles);
                        setCorruptFiles(corrupt);
                        setScanLogs([\`Populated demo database with \${newFiles.length} items.\`]);
                      } catch (e) {
                        console.error("Failed to load demo data", e);
                      }
                    });
                    setTourStepIndex(startStep);
                    setShowTour(true);
                    return;
                  }`;

const newBlock = `                  if (scannedFilesList.length < 5) {
                    localStorage.setItem("bitscribe_tour_status", JSON.stringify({ status: "active", startStep }));
                    if (onPopulateDemo) {
                      onPopulateDemo();
                    }
                    setTourStepIndex(startStep);
                    setShowTour(true);
                    return;
                  }`;

content = content.replace(oldBlock, newBlock);

fs.writeFileSync('packages/ui-components/src/Sidebar.tsx', content);
console.log("Updated Sidebar.tsx");
