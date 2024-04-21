type KeyHandler = () => void;

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


  constructor() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    this.setupListeners();
  }


  private setupListeners(): void {
    process.stdin.on('data', (key: string) => {
      if (!this.active) return;
      const handlers = this.listeners[key];
      handlers?.forEach(handler => handler());
      if (key === KEY_CODES.CTRL_C) { // Ctrl+C
        process.exit();
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

  pause(): void {
    this.active = false;
  }

  resume(): void {
    this.active = true;
  }

  destroy(): void {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeAllListeners('data');
  }
}
