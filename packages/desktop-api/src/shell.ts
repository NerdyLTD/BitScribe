import { Command as TauriCommand } from '@tauri-apps/plugin-shell';

export class Command {
  static create(program: string, args: string[]) {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      return TauriCommand.create(program, args);
    }
    return {
      execute: async () => ({ code: 0, stdout: '', stderr: '' }),
      on: () => {},
      spawn: async () => ({ kill: () => {} }),
    } as any;
  }
  static sidecar(program: string, args: string[]) {
    if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
      return TauriCommand.sidecar(program, args);
    }
    return {
      execute: async () => ({ code: 0, stdout: '', stderr: '' }),
      on: () => {},
      spawn: async () => ({ kill: () => {} }),
    } as any;
  }
}
