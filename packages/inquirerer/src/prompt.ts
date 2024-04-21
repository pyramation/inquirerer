import chalk from 'chalk'; 
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


  async promptCheckbox(_argv: any, question: Question): Promise<{[key: string]: boolean}> {
    this.keypress.resume();
    const options = question.options || [];
    let selectedIndex = 0;
    let startIndex = 0; // Start index for visible options
    const maxLines = question.maxDisplayLines || options.length; // Use provided max or total options
    const selections: boolean[] = new Array(options.length).fill(false);
  
    const display = (): void => {
      console.clear();
      const endIndex = Math.min(startIndex + maxLines, options.length);
      for (let i = startIndex; i < endIndex; i++) {
        const option = options[i];
        const isSelected = selectedIndex === i;
        const marker = isSelected ? '>' : ' ';
        const isChecked = selections[i] ? '◉' : '○';
        const line = `${marker} ${isChecked} ${option}`;
        console.log(isSelected ? chalk.blue(line) : line);
      }
    };
  
    display();
  
    this.keypress.on(KEY_CODES.UP_ARROW, () => {
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : options.length - 1;
      if (selectedIndex < startIndex) {
        startIndex = selectedIndex; // Scroll up
      } else if (selectedIndex === options.length - 1) {
        startIndex = Math.max(0, options.length - maxLines); // Jump to the bottom of the list
      }
      display();
    });
  
    this.keypress.on(KEY_CODES.DOWN_ARROW, () => {
      selectedIndex = (selectedIndex + 1) % options.length;
      if (selectedIndex >= startIndex + maxLines) {
        startIndex = selectedIndex - maxLines + 1; // Scroll down
      } else if (selectedIndex === 0) {
        startIndex = 0; // Jump to the top of the list
      }
      display();
    });
  
    this.keypress.on(KEY_CODES.SPACE, () => {
      selections[selectedIndex] = !selections[selectedIndex];
      display();
    });
  
    return new Promise<{[key: string]: boolean}>(resolve => {
      this.keypress.on(KEY_CODES.ENTER, () => {
        this.keypress.pause();
        const result: {[key: string]: boolean} = {};
        options.forEach((option, index) => {
          result[option] = selections[index];
        });
        resolve(result);
      });
    });
  }
  async promptAutocomplete(question: Question): Promise<string> {
    this.keypress.resume();
    const options = question.options || [];
    let input = '';
    let filteredOptions = options;
    let selectedIndex = 0;
    let startIndex = 0;  // Start index for visible options
    const maxLines = question.maxDisplayLines || options.length;  // Use provided max or total options

    const display = (): void => {
      console.clear();
      console.log(`Search: ${input}`);
      // Determine the range of options to display
      const endIndex = Math.min(startIndex + maxLines, filteredOptions.length);
      for (let i = startIndex; i < endIndex; i++) {
        const option = filteredOptions[i];
        if (i === selectedIndex) {
          console.log(chalk.blue('> ' + option)); // Highlight the selected option with chalk
        } else {
          console.log('  ' + option);
        }
      }
    };

    const updateFilteredOptions = (): void => {
      filteredOptions = this.filterOptions(options, input);
      // Adjust startIndex to keep the selectedIndex in the visible range
      if (selectedIndex < startIndex) {
        startIndex = selectedIndex;
      } else if (selectedIndex >= startIndex + maxLines) {
        startIndex = selectedIndex - maxLines + 1;
      }
      if (selectedIndex >= filteredOptions.length) {
        selectedIndex = Math.max(filteredOptions.length - 1, 0);
      }
    };

    display();

    // Handling BACKSPACE key
    this.keypress.on(KEY_CODES.BACKSPACE, () => {
      input = input.slice(0, -1);
      updateFilteredOptions();
      display();
    });

    // Register alphanumeric and space keypresses to accumulate input
    'abcdefghijklmnopqrstuvwxyz0123456789 '.split('').forEach(char => {
      this.keypress.on(char, () => {
        input += char;
        updateFilteredOptions();
        display();
      });
    });

    // Navigation
    this.keypress.on(KEY_CODES.UP_ARROW, () => {
      selectedIndex = selectedIndex - 1 >= 0 ? selectedIndex - 1 : filteredOptions.length - 1;
      if (selectedIndex < startIndex) {
        startIndex = selectedIndex;  // Scroll up
      } else if (selectedIndex === filteredOptions.length - 1) {
        startIndex = Math.max(0, filteredOptions.length - maxLines); // Jump to the bottom of the list
      }
      display();
    });
    this.keypress.on(KEY_CODES.DOWN_ARROW, () => {
      selectedIndex = (selectedIndex + 1) % filteredOptions.length;
      if (selectedIndex >= startIndex + maxLines) {
        startIndex = selectedIndex - maxLines + 1;  // Scroll down
      } else if (selectedIndex === 0) {
        startIndex = 0;  // Jump to the top of the list
      }
      display();
    });

    return new Promise<string>(resolve => {
      this.keypress.on(KEY_CODES.ENTER, () => {
        this.keypress.pause();
        resolve(filteredOptions[selectedIndex] || input);
      });
    });
  }


  filterOptions(options: string[], input: string): string[] {
    return options
      .filter(option => option.toLowerCase().startsWith(input.toLowerCase()))
      .sort();
  }


  // Method to cleanly close the readline interface
  public close() {
    if (this.rl) {
      this.rl.close();
      this.keypress.destroy();
    }
  }
}