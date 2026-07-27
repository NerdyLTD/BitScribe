export const join = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { join } = await import('@tauri-apps/api/path');
    return join(...args as Parameters<typeof join>);
  }
  return args.join('/');
};
export const downloadDir = async () => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { downloadDir } = await import('@tauri-apps/api/path');
    return downloadDir();
  }
  return '/downloads';
};
