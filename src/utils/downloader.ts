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
    try {
        let filePath = explicitPath;
        if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
            if (!filePath) {
                filePath = await save({ defaultPath: fileName });
            } else {
                filePath = await join(explicitPath, fileName);
            }
        }
        if (filePath) {
            if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
                const b64 = await blobToBase64(blob);
                await invoke('save_file', { path: filePath, contentsB64: b64 });
            } else {
                throw new Error("Not running in Tauri");
            }
        }
    } catch (e) {
        console.error('Failed to save file natively, falling back to browser download prompt:', e);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}
