export const open = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    return open(...args as Parameters<typeof open>);
  }
  return null;
};
export const save = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    return save(...args as Parameters<typeof save>);
  }
  return null;
};
