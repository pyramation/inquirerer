type KeyHandler = () => void;

export const KEY_CODES = {
  UP_ARROW: '\u001b[A',
  DOWN_ARROW: '\u001b[B',
  RIGHT_ARROW: '\u001b[C',
  LEFT_ARROW: '\u001b[D',
  ENTER: '\r',
  SPACE: ' ',
  CTRL_C: '\u0003'
};

export class TerminalKeypress {
  private listeners: Record<string, KeyHandler[]> = {};

  constructor() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', (key: string) => {
      const handlers = this.listeners[key];
      handlers?.forEach(handler => handler());

      // Exit on Ctrl+C
      if (key === '\u0003') {
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

  destroy(): void {
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdin.removeAllListeners('data');
  }
}
