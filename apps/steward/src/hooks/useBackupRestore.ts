import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { downloadOrSaveFile } from "../utils/downloader";
import { MediaItem, RuleCriteria } from "@bitscribe/core-types";

interface UseBackupRestoreProps {
  exportDirectory: string;
  setNotification: (val: any) => void;
  setScanPaths: (val: any) => void;
  setExcelColumns: (val: any) => void;
  setCustomRules: (val: any) => void;
  setExportDirectory: (val: string) => void;
  setScannedFilesList: (val: MediaItem[]) => void;
}

export function useBackupRestore({
  exportDirectory,
  setNotification,
  setScanPaths,
  setExcelColumns,
  setCustomRules,
  setExportDirectory,
  setScannedFilesList
}: UseBackupRestoreProps) {
  const handleBackup = async (type: 'full' | 'data' | 'settings') => {
      try {
          let backup: any = { type, timestamp: new Date().toISOString() };
          
          if (type === 'full' || type === 'settings') {
              backup.settings = {
                  plex_scan_paths: localStorage.getItem("plex_scan_paths"),
                  plex_excel_columns: localStorage.getItem("plex_excel_columns"),
                  plex_compat_rules: localStorage.getItem("plex_compat_rules"),
                  bitscribe_export_directory: localStorage.getItem("bitscribe_export_directory"),
                  bitscribe_custom_block_presets: localStorage.getItem("bitscribe_custom_block_presets"),
              };
          }
          
          if (type === 'full' || type === 'data') {
              const files = await invoke("get_db_files");
              backup.data = files;
          }

          const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
          await downloadOrSaveFile(`bitscribe_backup_${type}_${Date.now()}.json`, blob, exportDirectory || undefined);
          localStorage.setItem("last_backup_timestamp", new Date().toISOString());
          setNotification({ type: 'success', message: 'Backup saved successfully!' });
          setTimeout(() => setNotification(null), 5000);
      } catch (e: any) {
          setNotification({ type: 'error', message: 'Backup failed: ' + e.toString() });
          setTimeout(() => setNotification(null), 5000);
      }
  };

  const handleRestore = async () => {
      try {
          const selected = await open({ filters: [{ name: 'JSON', extensions: ['json'] }], multiple: false });
          if (!selected || typeof selected !== "string") return;
          
          const content = await readTextFile(selected);
          const backup = JSON.parse(content);
          
          if (!backup.type) {
              throw new Error("Invalid backup file format");
          }
          
          if (backup.settings) {
              if (backup.settings.plex_scan_paths) {
                  localStorage.setItem("plex_scan_paths", backup.settings.plex_scan_paths);
                  setScanPaths(JSON.parse(backup.settings.plex_scan_paths));
              }
              if (backup.settings.plex_excel_columns) {
                  localStorage.setItem("plex_excel_columns", backup.settings.plex_excel_columns);
                  setExcelColumns(JSON.parse(backup.settings.plex_excel_columns));
              }
              if (backup.settings.plex_compat_rules) {
                  localStorage.setItem("plex_compat_rules", backup.settings.plex_compat_rules);
                  setCustomRules(JSON.parse(backup.settings.plex_compat_rules));
              }
              if (backup.settings.bitscribe_export_directory) {
                  localStorage.setItem("bitscribe_export_directory", backup.settings.bitscribe_export_directory);
                  setExportDirectory(backup.settings.bitscribe_export_directory);
              }
              if (backup.settings.bitscribe_custom_block_presets) {
                  localStorage.setItem("bitscribe_custom_block_presets", backup.settings.bitscribe_custom_block_presets);
                  window.dispatchEvent(new Event("restore_custom_presets"));
              }
          }
          
          if (backup.data) {
              await invoke("clear_db");
              await invoke("save_db_files", { files: backup.data });
              const reloaded = await invoke("get_db_files");
              setScannedFilesList(reloaded as MediaItem[]);
          }
          
          setNotification({ type: 'success', message: 'Restore completed successfully!' });
          setTimeout(() => setNotification(null), 8000);
      } catch (e: any) {
          setNotification({ type: 'error', message: 'Restore failed: ' + e.toString() });
          setTimeout(() => setNotification(null), 8000);
      }
  };

  return { handleBackup, handleRestore };
}
