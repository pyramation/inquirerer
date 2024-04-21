
import readline from 'readline';

import { KEY_CODES,TerminalKeypress } from './keypress';
import { Question } from './question';
export class Inquirerer {
  private rl: readline.Interface | null;
  private keypress: TerminalKeypress;
  private noTty: boolean;

  constructor(noTty: boolean = false) {
    this.noTty = noTty;
    if (!noTty) {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      this.keypress = new TerminalKeypress();
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


  async promptCheckbox(_argv: any, question: Question): Promise<boolean[]> {
    const options = question.options || [];
    let selectedIndex = 0;
    const selections: boolean[] = new Array(options.length).fill(false);

    const display = (): void => {
      console.clear();
      options.forEach((option, index) => {
        const isSelected = selectedIndex === index ? '>' : ' ';
        const isChecked = selections[index] ? '◉' : '○';
        console.log(`${isSelected} ${isChecked} ${option}`);
      });
    };

    display();

    this.keypress.on(KEY_CODES.UP_ARROW, () => {
      selectedIndex = (selectedIndex - 1 + options.length) % options.length;
      display();
    });
    this.keypress.on(KEY_CODES.DOWN_ARROW, () => {
      selectedIndex = (selectedIndex + 1) % options.length;
      display();
    });
    this.keypress.on(KEY_CODES.SPACE, () => {
      selections[selectedIndex] = !selections[selectedIndex];
      display();
    });

    return new Promise<boolean[]>(resolve => {
      this.keypress.on(KEY_CODES.ENTER, () => {
        this.keypress.destroy();
        resolve(selections);
      });
    });
  }


  // Method to cleanly close the readline interface
  public close() {
    if (this.rl) {
      this.rl.close();
      this.keypress.destroy();
    }
  }
}