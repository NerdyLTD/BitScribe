export const readTextFile = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    return readTextFile(...args as Parameters<typeof readTextFile>);
  }
  return "";
};
export const writeFile = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    return writeFile(...args as Parameters<typeof writeFile>);
  }
};
export const mkdir = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { mkdir } = await import('@tauri-apps/plugin-fs');
    return mkdir(...args as Parameters<typeof mkdir>);
  }
};
export const exists = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { exists } = await import('@tauri-apps/plugin-fs');
    return exists(...args as Parameters<typeof exists>);
  }
  return false;
};
export const stat = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { stat } = await import('@tauri-apps/plugin-fs');
    return stat(...args as Parameters<typeof stat>);
  }
  return null;
};
