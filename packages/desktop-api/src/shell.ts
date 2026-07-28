export class Command {
  static create(program: string, args: string[]) {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const tauriShell = require('@tauri-apps/plugin-shell');
      return tauriShell.Command.create(program, args);
    }
    return {
      execute: async () => ({ code: 0, stdout: '', stderr: '' }),
      on: () => {},
      spawn: async () => ({ kill: () => {} }),
    } as any;
  }

  static sidecar(program: string, args: string[]) {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      const tauriShell = require('@tauri-apps/plugin-shell');
      return tauriShell.Command.sidecar(program, args);
    }
    return {
      execute: async () => ({ code: 0, stdout: '', stderr: '' }),
      on: () => {},
      spawn: async () => ({ kill: () => {} }),
    } as any;
  }
}
