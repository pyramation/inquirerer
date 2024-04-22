import chalk from 'chalk';
import readline from 'readline';
import { Readable, Writable } from 'stream';

import { KEY_CODES, TerminalKeypress } from './keypress';
import { AutocompleteQuestion, CheckboxQuestion, ConfirmQuestion, OptionValue,Question, TextQuestion, Value } from './question';

const requiredMessage = (question: Question) => chalk.red(`The field "${question.name}" is required. Please provide a value.\n`);
interface PromptContext {
  numTries: number;
}


function generatePromptMessage(question: Question, ctx: PromptContext): string {
  let promptMessage: string = '';
  if (question.message) {
    promptMessage = chalk.whiteBright(question.message) + '\n';
  }
  promptMessage += `${chalk.white('[')}${chalk.green('--'+question.name)}${chalk.white(']:')}\n`;

  if (ctx.numTries > 0 && question.required) {
    promptMessage = requiredMessage(question) + promptMessage;
  }

  switch (question.type) {
    case 'confirm':
      promptMessage += `(y/n)${question.default !== undefined ? ` [${question.default ? 'y' : 'n'}]` : ''}`;
      break;
    case 'text':
      if (question.default) {
        promptMessage += ` [${question.default}]`;
      }
      break;
    case 'autocomplete':
    case 'checkbox':
      // For these types, you might want to show the default selected options if any
      if (question.options && question.default) {
        const defaultOptions = Array.isArray(question.default) ? question.default : [question.default];
        const defaultText = defaultOptions.join(', ');
        promptMessage += ` [${defaultText}]`;
      }
      break;
  }

  return promptMessage;
}

export interface InquirererOptions {
  noTty?: boolean;
  input?: Readable;
  output?: Writable;
  useDefaults?: boolean;
  globalMaxLines?: number;
}
export class Inquirerer {
  private rl: readline.Interface | null;
  private keypress: TerminalKeypress;
  private noTty: boolean;
  private output: Writable;
  private input: Readable;
  private useDefaults: boolean;
  private globalMaxLines: number;

  constructor(
    options?: InquirererOptions
  ) {
    const {
      noTty = false,
      input = process.stdin,
      output = process.stdout,
      useDefaults = false,
      globalMaxLines = 10
    } = options ?? {}

    this.useDefaults = useDefaults;
    this.noTty = noTty;
    this.output = output;
    this.input = input;
    this.globalMaxLines = globalMaxLines;

    if (!noTty) {
      this.rl = readline.createInterface({
        input,
        // dissallow readline from prompting user, since we'll handle it!
        output 
        // : new Writable({
        //   write(chunk, encoding, callback) {
        //     callback(); // Do nothing with the data
        //   }
        // })
      });
      this.keypress = new TerminalKeypress(noTty, input);
    } else {
      this.rl = null;
    }
  }

  clearScreen() {
    // same as console.clear()
    this.output.write('\x1Bc'); // This is the escape sequence to clear the terminal screen.
  }

  write(message: string) {
    this.output.write(message);
  }

  log(message: string) {
    this.output.write(message + '\n');
  }

  getInput(input: string) {
    return `${chalk.white.bold('$')} ${input}`;
  }

  getPrompt(question: Question, ctx: PromptContext, input: string) {
    const promptMessage = generatePromptMessage(question, ctx);
    return promptMessage + this.getInput(input);
  }
  displayPrompt(question: Question, ctx: PromptContext, input: string) {
    const prompt = this.getPrompt(question, ctx, input);
    this.log(prompt);
  }

  public async prompt<T extends object>(params: T, questions: Question[], usageText?: string): Promise<T> {
    const obj: any = { ...params };

    // when interactive and missing a bunch of stuff, we should display to the user 
    if (usageText && Object.values(params).some(value => value === undefined) && !this.noTty) {
      this.log(usageText);
    }

    const needsContinue = (question: Question) => {
      const value = obj[question.name];
      return (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim().length === 0)  // Check for empty string, safely trimming it
      );
    };

    let index = 0;
    let numTries = 0;
    while (index < questions.length) {
      const question = questions[index];

      if ('default' in question && (this.useDefaults || question.useDefault)) {
        obj[question.name] = question.default;
        index++;  // Move to the next question
        continue;
      }

      const ctx: PromptContext = {
        numTries
      }
      if (needsContinue(question)) {
        switch (question.type) {
          case 'confirm':
            obj[question.name] = await this.confirm(question as ConfirmQuestion, ctx);
            break;
          case 'checkbox':
            obj[question.name] = await this.checkbox(question as CheckboxQuestion, ctx);
            break;
          case 'autocomplete':
            obj[question.name] = await this.autocomplete(question as AutocompleteQuestion, ctx);
            break;
          case 'text':
          default:
            obj[question.name] = await this.text(question as TextQuestion, ctx);  // Use promptText instead of text
            break;
        }
        // Check if the question is required and the response is not adequate
        if (question.required && needsContinue(question)) {
          // Reset the property to undefined to re-trigger the prompt
          numTries++;
          obj[question.name] = undefined;
          continue;  // Stay on the same question
        } else {
          if ('default' in question) {
            obj[question.name] = question.default;
          }
        }
      }
      index++;  // Move to the next question
      numTries = 0;
    }

    return obj as T;
  }

  async confirm(question: ConfirmQuestion, ctx: PromptContext): Promise<boolean> {
    if (this.noTty || !this.rl) return question.default ?? false;  // Return default if non-interactive

    return new Promise<boolean>((resolve) => {
      this.clearScreen();
      this.rl.question(this.getPrompt(question, ctx, ''), (answer) => {
        const userInput = answer.trim().toLowerCase();

        if (userInput === '') {
          resolve(question.default ?? false);  // Use default value if input is empty
        } else if (['yes', 'y'].includes(userInput)) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  async text(question: TextQuestion, ctx: PromptContext): Promise<string | null> {
    if (this.noTty || !this.rl) return question.default ?? null;  // Return default if non-interactive

    let input = '';

    return new Promise<string | null>((resolve) => {
      this.clearScreen();
      this.rl.question(this.getPrompt(question, ctx, input), (answer) => {  // Include the prompt directly in the question method
        input = answer;
        if (input.trim() !== '') {
          resolve(input);  // Return input if not empty
        } else {
          resolve(null);  // Return null if empty and not required
        }
      });
    });
  }

  async checkbox(question: CheckboxQuestion, ctx: PromptContext): Promise<OptionValue[]> {
    if (this.noTty || !this.rl) return question.default ?? [];  // Return default if non-interactive

    this.keypress.resume();
    const options = (question.options ?? []).map(option=>this.getOptionValue(option))
    let input = ''; // Search input
    let filteredOptions = options;
    let selectedIndex = 0;
    let startIndex = 0; // Start index for visible options
    const maxLines = this.getMaxLines(question, options.length) // Use provided max or total options
    const selections: boolean[] = new Array(options.length).fill(false);

    const updateFilteredOptions = (): void => {
      filteredOptions = options.filter(option => option.name.toLowerCase().includes(input.toLowerCase()));
    };

    const display = (): void => {
      this.clearScreen();
      this.displayPrompt(question, ctx, input);
      const endIndex = Math.min(startIndex + maxLines, filteredOptions.length);
      for (let i = startIndex; i < endIndex; i++) {
        const option = filteredOptions[i];
        const isSelected = selectedIndex === i;
        const marker = isSelected ? '>' : ' ';
        const index = options.map(o=>o.name).indexOf(option.name);
        if (index >= 0) {
          const isChecked = selections[index] ? '◉' : '○'; // Use the original index in options
          const line = `${marker} ${isChecked} ${option.name}`;
          this.log(isSelected ? chalk.blue(line) : line);
        } else {
          this.log('No options'); // sometimes user searches and there are no options...
        }
      }
    };

    display();

    // Handling BACKSPACE key
    this.keypress.on(KEY_CODES.BACKSPACE, () => {
      input = input.slice(0, -1);
      updateFilteredOptions();
      display();
    });

    // Register alphanumeric keypresses to accumulate input, excluding space
    'abcdefghijklmnopqrstuvwxyz0123456789'.split('').forEach(char => {
      this.keypress.on(char, () => {
        input += char;
        updateFilteredOptions();
        display();
      });
    });

    this.keypress.on(KEY_CODES.UP_ARROW, () => {
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : filteredOptions.length - 1;
      if (selectedIndex < startIndex) {
        startIndex = selectedIndex; // Scroll up
      } else if (selectedIndex === filteredOptions.length - 1) {
        startIndex = Math.max(0, filteredOptions.length - maxLines); // Jump to the bottom of the list
      }
      display();
    });

    this.keypress.on(KEY_CODES.DOWN_ARROW, () => {
      selectedIndex = (selectedIndex + 1) % filteredOptions.length;
      if (selectedIndex >= startIndex + maxLines) {
        startIndex = selectedIndex - maxLines + 1; // Scroll down
      } else if (selectedIndex === 0) {
        startIndex = 0; // Jump to the top of the list
      }
      display();
    });

    this.keypress.on(KEY_CODES.SPACE, () => {
      // Map filtered index back to the original index in options
      selections[options.indexOf(filteredOptions[selectedIndex])] = !selections[options.indexOf(filteredOptions[selectedIndex])];
      display();
    });

    return new Promise<Value[]>(resolve => {
      this.keypress.on(KEY_CODES.ENTER, () => {
        this.keypress.pause();
        const result: Value[] = [];
        if (question.returnFullResults) {
          // Return all options with their selected status
          options.forEach((option, index) => {
            result.push({
              name: option.name,
              value: selections[index]
            });
          });
        } else {
          // Return only options that are selected
          options.forEach((option, index) => {
            if (selections[index]) {
              result.push({
                name: option.name,
                value: selections[index]
              });
            }
          });
        }
        resolve(result);
      });
    });
  }

  private getOptionValue(option: string | OptionValue): OptionValue {
    if (typeof option === 'string') {
      return { name: option, value: option };
    } else {
      return { name: option.name, value: option.value };
    }
  }

  async autocomplete(question: AutocompleteQuestion, ctx: PromptContext): Promise<any> {
    if (this.noTty || !this.rl) return question.default ?? false;  // Return default if non-interactive

    this.keypress.resume();
    const options = (question.options ?? []).map(option => this.getOptionValue(option));

    let input = '';
    let filteredOptions = options;
    let selectedIndex = 0;
    let startIndex = 0;  // Start index for visible options
    const maxLines = this.getMaxLines(question, options.length) // Use provided max or total options

    const display = (): void => {
      this.clearScreen();
      this.displayPrompt(question, ctx, input);
      // Determine the range of options to display
      const endIndex = Math.min(startIndex + maxLines, filteredOptions.length);
      for (let i = startIndex; i < endIndex; i++) {
        const option = filteredOptions[i];
        if (!option) {
          this.log('No options'); // sometimes user searches and there are no options...
        } else if (i === selectedIndex) {
          this.log(chalk.blue('> ' + option.name)); // Highlight the selected option with chalk
        } else {
          this.log('  ' + option.name);
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

    return new Promise<OptionValue>(resolve => {
      this.keypress.on(KEY_CODES.ENTER, () => {
        this.keypress.pause();
        resolve(filteredOptions[selectedIndex]?.value || input );
      });
    });
  }

  filterOptions(options: OptionValue[], input: string): OptionValue[] {
    return options
      .filter(option => option.name.toLowerCase().startsWith(input.toLowerCase()))
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1; // b first
        }
        if (a.name > b.name) {
          return 1; // a is first
        }
        return 0; // equal
      });
  }

  getMaxLines(question: { maxDisplayLines?: number }, defaultLength: number): number {
    if (question.maxDisplayLines) {
      return question.maxDisplayLines;
    }

    // if (!this.noTty && (this.output as any).isTTY) {
    //   const rows = Math.round(((this.output as any).rows ?? 0) / 7);
    //   return Math.max(rows, defaultLength);
    // }
    return Math.min(this.globalMaxLines, defaultLength);
  }

  // Method to cleanly close the readline interface
  public close() {
    if (this.rl) {
      this.rl.close();
      this.keypress.destroy();
    }
  }
}