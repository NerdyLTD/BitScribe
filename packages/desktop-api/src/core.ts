export const invoke = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke(...args as Parameters<typeof invoke>);
  }
  return null;
};
