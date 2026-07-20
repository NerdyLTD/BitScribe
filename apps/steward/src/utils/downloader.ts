import { save } from '@tauri-apps/plugin-dialog';
import { join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';

function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                const b64 = reader.result.split(',')[1];
                resolve(b64);
            } else {
                reject(new Error("Failed to convert blob to base64"));
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

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
                const b64 = await blobToBase64(blob);
                await invoke('save_file', { path: filePath, contentsB64: b64 });
                wasSavedNatively = true;
            }
        } catch (e: any) {
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
