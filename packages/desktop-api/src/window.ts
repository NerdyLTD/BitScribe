import { getCurrentWindow as getCurrentTauriWindow } from '@tauri-apps/api/window';

export const getCurrentWindow = () => {
  if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
    return getCurrentTauriWindow();
  }
  return {
    toggleMaximize: () => {},
    close: () => {},
    minimize: () => {},
    isMaximized: async () => false,
  } as any;
};
