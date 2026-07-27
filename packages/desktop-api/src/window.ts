export const getCurrentWindow = () => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    // Cannot dynamically import getCurrentWindow synchronously, so this needs special handling if used synchronously
    const tauriWindow = require('@tauri-apps/api/window');
    return tauriWindow.getCurrentWindow();
  }
  return {
    toggleMaximize: () => {},
    close: () => {},
    minimize: () => {},
    isMaximized: async () => false,
  } as any;
};
