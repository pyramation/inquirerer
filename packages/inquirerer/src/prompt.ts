
import readline from 'readline';

import { Question } from './question';
export class Inquirerer {
  private rl: readline.Interface | null;
  private noTty: boolean;

  constructor(noTty: boolean = false) {
    this.noTty = noTty;
    if (!noTty) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      process.stdin.setRawMode(true);
      process.stdin.resume();
    } else {
      this.rl = null;
    }
  }

  // Method to prompt for missing parameters
  public async prompt<T extends object>(params: T, questions: Question[], usageText?: string): Promise<T> {
    const obj: any = { ...params };

    if (usageText && Object.values(params).some(value => value === undefined) && !this.noTty) {
      console.log(usageText);
    }

    for (const question of questions) {
      if (obj[question.name] === undefined) {
        if (!this.noTty) {
          if (this.rl) {
            obj[question.name] = await new Promise<string>((resolve) => {
              this.rl.question(`Enter ${question.name}: `, resolve);
            });
          } else {
            throw new Error("No TTY available and a readline interface is missing.");
          }
        } else {
          // Optionally handle noTty cases, e.g., set defaults or throw errors
          throw new Error(`Missing required parameter: ${question.name}`);
        }
      }
    }

    return obj as T;
  }

  async promptCheckbox(_argv: any, question: Question) {
    const { options } = question;
    let selectedIndex = 0;
    const selections = new Array(options.length).fill(false);

    const display = () => {
      console.clear();
      // @ts-ignore
      options.forEach((option, index) => {
        const isSelected = selectedIndex === index ? '>' : ' ';
        const isChecked = selections[index] ? '◉' : '○';
        console.log(`${isSelected} ${isChecked} ${option}`);
      });
    };

    return new Promise((resolve) => {
      display();

      // @ts-ignore
      const onKeyPress = (chunk, key) => {
        const char = chunk.toString();

        if (key && key.ctrl && key.name === 'c') {
          process.exit(); // exit on Ctrl+C
        }

        if (char === '\u001b[A' || char === 'w') { // arrow up or 'w'
          selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        } else if (char === '\u001b[B' || char === 's') { // arrow down or 's'
          selectedIndex = (selectedIndex + 1) % options.length;
        } else if (char === ' ') { // space bar
          selections[selectedIndex] = !selections[selectedIndex];
        } else if (char === '\r') { // enter key
          process.stdin.removeListener('data', onKeyPress);
          process.stdin.setRawMode(false);
          resolve(selections);
          return;
        }

        display();
      };

      process.stdin.on('data', onKeyPress);
    });
  }

  // Method to cleanly close the readline interface
  public close() {
    if (this.rl) {
      this.rl.close();
      process.stdin.setRawMode(false);
    process.stdin.pause();
    }
  }
}