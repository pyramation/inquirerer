import { Readable } from 'stream';

type KeyHandler = () => void;

interface ProcessWrapper {
  exit: (code?: number) => never;
}

const defaultProcessWrapper: ProcessWrapper = {
  exit: (code?: number) => process.exit(code)
};

export const KEY_CODES = {
  UP_ARROW: '\u001b[A',
  DOWN_ARROW: '\u001b[B',
  RIGHT_ARROW: '\u001b[C',
  LEFT_ARROW: '\u001b[D',
  ENTER: '\r',
  SPACE: ' ',
  CTRL_C: '\u0003',
  BACKSPACE: '\x7f',  // Commonly used BACKSPACE key in Unix-like systems
  BACKSPACE_LEGACY: '\x08'  // For compatibility with some systems
};

export class TerminalKeypress {
  private listeners: Record<string, KeyHandler[]> = {};
  private active: boolean = true;
  private noTty: boolean;
  private input: Readable;
  private proc: ProcessWrapper;

  constructor(
    noTty: boolean = false,
    input: Readable = process.stdin,
    proc: ProcessWrapper = defaultProcessWrapper,
  ) {
    this.noTty = noTty;
    this.input = input;
    this.proc = proc;

    if (this.isTTY()) {
      if (typeof (this.input as any).setRawMode === 'function') {
        (this.input as any).setRawMode(true);
      }
      this.input.resume();
      this.input.setEncoding('utf8');
    }
    this.setupListeners();
  }

  isTTY() {
    return !this.noTty;
  }

  private setupListeners(): void {
    this.input.on('data', (key: string) => {
      if (!this.active) return;
      const handlers = this.listeners[key];
      handlers?.forEach(handler => handler());
      if (key === KEY_CODES.CTRL_C) { // Ctrl+C
        this.proc.exit(0);
      }
    });
  }

  on(key: string, callback: KeyHandler): void {
    if (!this.listeners[key]) {
      this.listeners[key] = [];
    }
    this.listeners[key].push(callback);
  }

  off(key: string, callback: KeyHandler): void {
    if (this.listeners[key]) {
      const index = this.listeners[key].indexOf(callback);
      if (index !== -1) {
        this.listeners[key].splice(index, 1);
      }
    }
  }

  clearHandlers(): void {
    this.listeners = {};
  }

  pause(): void {
    this.active = false;
  }

  resume(): void {
    this.active = true;
  }

  destroy(): void {
    if (typeof (this.input as any).setRawMode === 'function') {
      (this.input as any).setRawMode(false);
    }
    this.input.pause();
    this.input.removeAllListeners('data');
  }
}
