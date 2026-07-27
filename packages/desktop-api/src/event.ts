export const listen = async (...args: any[]) => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    const { listen } = await import('@tauri-apps/api/event');
    return listen(...args as Parameters<typeof listen>);
  }
  return () => {};
};
