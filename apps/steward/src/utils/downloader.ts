import { save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { writeFile } from '@tauri-apps/plugin-fs';

export async function downloadOrSaveFile(fileName: string, blob: Blob, explicitPath?: string) {
    let wasSavedNatively = false;
    let nativeError: any = null;
    
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
            let filePath = explicitPath;
            if (!filePath) {
                filePath = await save({ defaultPath: fileName });
            } else {
                filePath = await join(explicitPath, fileName);
            }
            
            if (filePath) {
                const buffer = await blob.arrayBuffer();
                const data = new Uint8Array(buffer);
                await writeFile(filePath, data);
                wasSavedNatively = true;
            }
        } catch (e: any) {
            console.error("Downloader native error:", e);
            nativeError = e;
        }
    }

    if (!wasSavedNatively) {
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            let errorMsg = nativeError?.message || String(nativeError);
            let displayPath = explicitPath ? ` to "${explicitPath}"` : "";
            
            if (errorMsg.includes("Permission denied") || errorMsg.includes("access") || errorMsg.includes("os error 5")) {
                throw new Error(`Write Permission Denied: Unable to write report file${displayPath}. Please make sure the folder is not write-protected and that you have administrator/write access.`);
            } else if (errorMsg.includes("No such file") || errorMsg.includes("os error 3") || errorMsg.includes("os error 2")) {
                throw new Error(`Directory Not Found: The selected folder path "${explicitPath || ""}" does not exist. Please check the export directory configuration in Settings.`);
            } else {
                throw new Error(`Unable to save report file${displayPath}: ${errorMsg}`);
            }
        } else {
            // Web environment: trigger standard browser download prompt
            try {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            } catch (browserErr: any) {
                throw new Error(`Web browser download failed: ${browserErr.message || String(browserErr)}`);
            }
        }
    }
}
