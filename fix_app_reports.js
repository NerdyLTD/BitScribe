const fs = require('fs');
let app = fs.readFileSync('apps/steward/src/App.tsx', 'utf8');

const searchStr = 'const [exportDirectory, setExportDirectory] = useState<string>(() => localStorage.getItem("bitscribe_export_directory") || "");';
const insertStr = `const [exportDirectory, setExportDirectory] = useState<string>(() => localStorage.getItem("bitscribe_export_directory") || "");

  useEffect(() => {
    async function initDirs() {
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke, join, mkdir, exists } = await import('@bitscribe/desktop-api');
          const dataDir = await invoke("get_data_dir") as string;
          const reportsPath = await join(dataDir, "Reports");
          if (!(await exists(reportsPath))) {
            await mkdir(reportsPath);
          }
          if (!localStorage.getItem("bitscribe_export_directory")) {
            setExportDirectory(reportsPath);
            localStorage.setItem("bitscribe_export_directory", reportsPath);
          }
        } catch (e) {
          console.error("Failed to init dirs", e);
        }
      }
    }
    initDirs();
  }, []);`;

app = app.replace(searchStr, insertStr);
fs.writeFileSync('apps/steward/src/App.tsx', app);
