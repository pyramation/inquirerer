import chalk from 'chalk';
import readline from 'readline';
import { Readable, Writable } from 'stream';

import { KEY_CODES, TerminalKeypress } from './keypress';
import { AutocompleteQuestion, CheckboxQuestion, ConfirmQuestion, NumberQuestion, OptionValue, Question, TextQuestion, Validation, Value } from './question';

export interface ManPageInfo {
  commandName: string;
  questions: Question[];
  author?: string;
  description?: string;
}
export interface PromptOptions {
  usageText?: string;
  manPageInfo?: ManPageInfo;
  mutateArgs?: boolean;
}

const validationMessage = (question: Question, ctx: PromptContext): string => {
  if (ctx.numTries === 0 || ctx.validation.success) {
    return ''; // No message if first attempt or validation was successful
  }

  if (ctx.validation.reason) {
    return chalk.red(`The field "${question.name}" is invalid: ${ctx.validation.reason}\n`);
  }

  switch (ctx.validation.type) {
    case 'required':
      return chalk.red(`The field "${question.name}" is required. Please provide a value.\n`);
    case 'pattern':
      return chalk.red(`The field "${question.name}" does not match the pattern: ${question.pattern}.\n`);
    default:
      return chalk.red(`The field "${question.name}" is invalid. Please try again.\n`);
  }
};
class PromptContext {
  numTries: number = 0;
  needsInput: boolean = true;
  validation: Validation = { success: false };

  constructor() { }

  tryAgain(validation: Partial<Validation>): void {
    this.numTries++;
    this.needsInput = true;
    this.validation = { ...this.validation, ...validation, success: false };
  }

  nextQuestion(): void {
    this.numTries = 0;
    this.needsInput = false;
    this.validation = { success: true };
  }

  process(validation: Validation | boolean): Validation {
    if (typeof validation === 'boolean') {
      if (validation) {
        this.nextQuestion();
      } else {
        this.tryAgain({ type: 'validation' });
      }
    } else {
      if (validation.success) {
        this.nextQuestion();
      } else {
        this.tryAgain(validation);
      }
    }
    return this.validation;
  }
}


function generatePromptMessage(question: Question, ctx: PromptContext): string {
  let promptMessage: string = '';
  if (question.message) {
    promptMessage = chalk.whiteBright(question.message) + '\n';
  }
  promptMessage += `${chalk.white('[')}${chalk.green('--' + question.name)}${chalk.white(']:')}\n`;

  promptMessage = validationMessage(question, ctx) + promptMessage;

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
  mutateArgs?: boolean;

}
export class Inquirerer {
  private rl: readline.Interface | null;
  private keypress: TerminalKeypress;
  private noTty: boolean;
  private output: Writable;
  private input: Readable;
  private useDefaults: boolean;
  private globalMaxLines: number;
  private mutateArgs: boolean;

  constructor(
    options?: InquirererOptions
  ) {
    const {
      noTty = false,
      input = process.stdin,
      output = process.stdout,
      useDefaults = false,
      globalMaxLines = 10,
      mutateArgs = true
    } = options ?? {}

    this.useDefaults = useDefaults;
    this.noTty = noTty;
    this.output = output;
    this.mutateArgs = mutateArgs;
    this.input = input;
    this.globalMaxLines = globalMaxLines;

    if (!noTty) {
      this.rl = readline.createInterface({
        input,
        output
      });
      this.keypress = new TerminalKeypress(noTty, input);
    } else {
      this.rl = null;
    }
  }

  private clearScreen() {
    // same as console.clear()
    this.output.write('\x1Bc'); // This is the escape sequence to clear the terminal screen.
  }

  private write(message: string) {
    this.output.write(message);
  }

  private log(message: string) {
    this.output.write(message + '\n');
  }

  private getInput(input: string) {
    return `${chalk.white.bold('$')} ${input}`;
  }

  private getPrompt(question: Question, ctx: PromptContext, input: string) {
    const promptMessage = generatePromptMessage(question, ctx);
    return promptMessage + this.getInput(input);
  }
  private displayPrompt(question: Question, ctx: PromptContext, input: string) {
    const prompt = this.getPrompt(question, ctx, input);
    this.log(prompt);
  }

  public generateManPage(opts: ManPageInfo): string {
    let manPage = `${chalk.white('NAME')}\n\t${chalk.white(opts.commandName)} ${opts.description ?? ''}\n\n`;

    // Constructing the SYNOPSIS section with required and optional arguments
    let requiredArgs = '';
    let optionalArgs = '';

    opts.questions.forEach(question => {
      if (question.required) {
        requiredArgs += ` ${chalk.white('--' + question.name)} <${chalk.gray(question.name)}>`;
      } else {
        optionalArgs += ` [${chalk.white('--' + question.name)}${question.default ? `=${chalk.gray(String(question.default))}` : ''}]`;
      }
    });

    manPage += `${chalk.white('SYNOPSIS')}\n\t${chalk.white(opts.commandName)}${chalk.gray(requiredArgs)}${chalk.gray(optionalArgs)}\n\n`;
    manPage += `${chalk.white('DESCRIPTION')}\n\tUse this command to interact with the application. It supports the following options:\n\n`;

    opts.questions.forEach(question => {
      manPage += `${chalk.white(question.name.toUpperCase())}\n`;
      manPage += `\t${chalk.white('Type:')} ${chalk.gray(question.type)}\n`;
      if (question.message) {
        manPage += `\t${chalk.white('Summary:')} ${chalk.gray(question.message)}\n`;
      }
      if (question.description) {
        manPage += `\t${chalk.white('Description:')} ${chalk.gray(question.description)}\n`;
      }
      if ('options' in question) {
        const optionsList = Array.isArray(question.options)
          ? question.options.map(opt => typeof opt === 'string' ? chalk.gray(opt) : `${chalk.gray(opt.name)} (${chalk.gray(opt.value)})`).join(', ')
          : '';
        manPage += `\t${chalk.white('Options:')} ${chalk.gray(optionsList)}\n`;
      }
      if (question.default !== undefined) {
        manPage += `\t${chalk.white('Default:')} ${chalk.gray(JSON.stringify(question.default))}\n`;
      }
      if (question.required) {
        manPage += `\t${chalk.white('Required:')} ${chalk.gray('Yes')}\n`;
      } else {
        manPage += `\t${chalk.white('Required:')} ${chalk.gray('No')}\n`;
      }
      manPage += '\n';
    });

    manPage += `${chalk.white('EXAMPLES')}\n\tExample usage of \`${chalk.white(opts.commandName)}\`.\n\t$ ${chalk.white(opts.commandName)}${chalk.gray(requiredArgs)}${chalk.gray(optionalArgs)}\n\n`;
    manPage += opts.author ? `${chalk.white('AUTHOR')}\n\t${chalk.white(opts.author)}\n` : '';
    return manPage;
  }

  private isValidatableAnswer(answer: any): boolean {
    return answer !== undefined;
  }

  private validateAnswer(question: Question, answer: any, obj: any, ctx: PromptContext): Validation {
    const validation = this.validateAnswerPattern(question, answer);
    if (!validation.success) {
      return ctx.process(validation);
    }

    if (question.validate) {
      const customValidation = question.validate(answer, obj);
      return ctx.process(customValidation);
    }

    return ctx.process({
      success: true
    });
  }

  private isValid(question: Question, obj: any, ctx: PromptContext): boolean {
    if (this.isValidatableAnswer(obj[question.name])) {
      obj[question.name] = this.sanitizeAnswer(question, obj[question.name], obj);
      const validationResult = this.validateAnswer(question, obj[question.name], obj, ctx);
      if (!validationResult.success) {
        return false;
      }
    }

    if (question.required && this.isEmptyAnswer(obj[question.name])) {
      ctx.tryAgain({ type: 'required' });
      return false;
    }

    return true;
  }

  private validateAnswerPattern(question: Question, answer: any): Validation {
    if (question.pattern && typeof answer === 'string') {
      const regex = new RegExp(question.pattern);
      const success = regex.test(answer);
      if (success) {
        return {
          success
        }
      } else {
        return {
          type: 'pattern',
          success: false,
          reason: question.pattern
        }
      }
    }
    return {
      success: true
    }
  }

  private isEmptyAnswer(answer: any): boolean {
    switch (true) {
      case answer === undefined:
      case answer === null:
      case answer === '':
      case Array.isArray(answer) && answer.length === 0:
        return true;
    }
    return false;
  }

  private sanitizeAnswer(question: Question, answer: any, obj: any): any {
    if (question.sanitize) {
      return question.sanitize(answer, obj);
    }
    return answer;
  }

  public exit() {
    this.clearScreen();
    this.close();
  }

  public async prompt<T extends object>(
    argv: T,
    questions: Question[],
    options?: PromptOptions
  ): Promise<T> {

    // use local mutateArgs if defined, otherwise global mutateArgs
    const shouldMutate = options?.mutateArgs !== undefined ? options.mutateArgs : this.mutateArgs;
    let obj: any = shouldMutate ? argv : { ...argv };

    // first loop through the question, and set any overrides in case other questions use objs for validation
    this.applyOverrides(argv, obj, questions);

    // Check for required arguments when no terminal is available (non-interactive mode)
    if (this.noTty && this.hasMissingRequiredArgs(questions, argv)) {

      // Apply default values for all questions
      this.applyDefaultValues(questions, obj);

      // Recheck for missing required arguments after applying defaults
      // NOT so sure this would ever happen, but possible if developer did something wrong
      if (!this.hasMissingRequiredArgs(questions, argv)) {
        return obj as T;  // Return the updated object if no required arguments are missing
      }

      // Handle error for missing required arguments
      this.handleMissingArgsError(options);
      throw new Error('Missing required arguments. Please provide all required parameters.');
    }

    for (let index = 0; index < questions.length; index++) {
      const question = questions[index];
      const ctx: PromptContext = new PromptContext();

      // obj is already either argv itself, or a clone, but let's check if it has the property
      if (question.name in obj) {
        this.handleOverrides(argv, obj, question);
        ctx.nextQuestion();
        continue;
      }

      // Apply default value if applicable
      // this is if useDefault is set, rare! not typical defaults which happen AFTER
      // this is mostly to avoid a prompt for "hidden" options
      if ('default' in question && (this.useDefaults || question.useDefault)) {
        obj[question.name] = question.default;
        continue;  // Skip to the next question since the default is applied
      }

      while (ctx.needsInput) {
        obj[question.name] = await this.handleQuestionType(question, ctx);

        if (!this.isValid(question, obj, ctx)) {
          if (this.noTty) {
            // If you're not valid and here with noTty, you're out!
            this.clearScreen(); // clear before leaving, not calling exit() since it may be a bad pattern to continue, devs should try/catch
            throw new Error('Missing required arguments. Please provide all required parameters.');
          }
          continue;
        }
        // If input passes validation and is not empty, or not required, move to the next question
        ctx.nextQuestion();
      }
    }

    return obj as T;
  }

  private handleMissingArgsError(options?: { usageText?: string; manPageInfo?: any }): void {
    this.clearScreen();
    if (options?.usageText) {
      this.log(options.usageText);
    } else if (options?.manPageInfo) {
      this.log(this.generateManPage(options.manPageInfo));
    } else {
      this.log('Missing required arguments. Please provide all required parameters.');
    }
  }

  private hasMissingRequiredArgs(questions: Question[], argv: any): boolean {
    return questions.some(question => question.required && this.isEmptyAnswer(argv[question.name]));
  }

  private applyDefaultValues(questions: Question[], obj: any): void {
    questions.forEach(question => {
      if ('default' in question) {
        obj[question.name] = question.default;  // Set default value if specified
      }
    });
  }

  private applyOverrides(argv: any, obj: any, questions: Question[]): void {
    questions.forEach(question => {
      if (question.name in argv) {
        this.handleOverrides(argv, obj, question);
      }
    });
  }

  private handleOverrides(argv: any, obj: any, question: Question): void {
    switch (question.type) {
      case 'text':
      case 'confirm':
        // do nothing, already set!
        break;
      case 'checkbox':
      case 'autocomplete':
        // get the value from options :)
        this.handleOverridesWithOptions(argv, obj, question);
        break;
      default:
        return;
    }
  }

  private handleOverridesWithOptions(argv: any, obj: any, question: CheckboxQuestion | AutocompleteQuestion): void {
    // obj is already either argv itself, or a clone, but let's check if it has the property
    if (Object.prototype.hasOwnProperty.call(argv, question.name) && typeof argv[question.name] === 'string') {
      const options = this.sanitizeOptions(question);
      const found = options.find(option => option.name === argv[question.name]);
      if (typeof found !== 'undefined') {
        obj[question.name] = found.value;
      }
    }
  }

  private async handleQuestionType(question: Question, ctx: PromptContext): Promise<any> {
    switch (question.type) {
      case 'confirm':
        return this.confirm(question as ConfirmQuestion, ctx);
      case 'checkbox':
        return this.checkbox(question as CheckboxQuestion, ctx);
      case 'autocomplete':
        return this.autocomplete(question as AutocompleteQuestion, ctx);
      case 'number':
        return this.number(question as NumberQuestion, ctx);
      case 'text':
        return this.text(question as TextQuestion, ctx);
      default:
        return this.text(question as TextQuestion, ctx);
    }
  }

  public async confirm(question: ConfirmQuestion, ctx: PromptContext): Promise<boolean> {
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

  public async text(question: TextQuestion, ctx: PromptContext): Promise<string | null> {
    if (this.noTty || !this.rl) {
      if ('default' in question) {
        return question.default;
      }
      return;
    }

    let input = '';

    return new Promise<string | null>((resolve) => {
      this.clearScreen();
      this.rl.question(this.getPrompt(question, ctx, input), (answer) => {  // Include the prompt directly in the question method
        input = answer;
        if (input.trim() !== '') {
          resolve(input);  // Return input if not empty
        } else if ('default' in question) {
          resolve(question.default);  // Use default if input is empty
        } else {
          resolve(null);  // Return null if empty and not required
        }
      });
    });
  }

  public async number(question: NumberQuestion, ctx: PromptContext): Promise<number | null> {
    if (this.noTty || !this.rl) {
      if ('default' in question) {
        return question.default;
      }
      return;
    }

    let input = '';

    return new Promise<number | null>((resolve) => {
      this.clearScreen();
      this.rl.question(this.getPrompt(question, ctx, input), (answer) => {
        input = answer.trim();
        if (input !== '') {
          const num = Number(input);
          if (!isNaN(num)) {
            resolve(num);
          } else {
            resolve(null); // Let validation handle bad input
          }
        } else if ('default' in question) {
          resolve(question.default); // Use default if input is empty
        } else {
          resolve(null); // Empty and no default
        }
      });
    });
  }

  public async checkbox(question: CheckboxQuestion, ctx: PromptContext): Promise<OptionValue[]> {
    if (this.noTty || !this.rl) {
      const options = this.sanitizeOptions(question);

      const defaults = Array.isArray(question.default)
        ? question.default
        : [question.default];

      // If returnFullResults is true, return all options with boolean selection
      if (question.returnFullResults) {
        return options.map(opt => ({
          name: opt.name,
          value: defaults.includes(opt.name)
        }));
      }

      // Otherwise, return only selected options
      return options
        .filter(opt => defaults.includes(opt.name) || defaults.includes(opt.value))
        .map(opt => ({
          name: opt.name,
          value: opt.value
        }));

    }

    if (!question.options.length) {
      // no arguments don't make sense
      throw new Error('checkbox requires options');
    }

    this.keypress.resume();
    const options = this.sanitizeOptions(question);
    let input = ''; // Search input
    let filteredOptions = options;
    let selectedIndex = 0;
    let startIndex = 0; // Start index for visible options
    const maxLines = this.getMaxLines(question, options.length) // Use provided max or total options
    // const selections: boolean[] = new Array(options.length).fill(false);

    const selections: boolean[] = options.map(opt => {
      if (!question.default) return false;

      const defaults = Array.isArray(question.default)
        ? question.default
        : [question.default];

      return defaults.includes(opt.name);
    });

    const updateFilteredOptions = (): void => {
      filteredOptions = this.filterOptions(options, input);
    };

    const display = (): void => {
      this.clearScreen();
      this.displayPrompt(question, ctx, input);
      const endIndex = Math.min(startIndex + maxLines, filteredOptions.length);
      for (let i = startIndex; i < endIndex; i++) {
        const option = filteredOptions[i];
        const isSelected = selectedIndex === i;
        const marker = isSelected ? '>' : ' ';
        const index = options.map(o => o.name).indexOf(option.name);
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

  public async autocomplete(question: AutocompleteQuestion, ctx: PromptContext): Promise<any> {
    if (this.noTty || !this.rl) {
      if ('default' in question) {
        return question.default;
      }
      return;
    }

    if (!question.options.length) {
      throw new Error('autocomplete requires options');
    }

    this.keypress.resume();
    const options = this.sanitizeOptions(question);

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
        resolve(filteredOptions[selectedIndex]?.value || input);
      });
    });
  }

  private getOptionValue(option: string | OptionValue): OptionValue {
    if (typeof option === 'string') {
      return { name: option, value: option };
    } else if (typeof option === 'object' && option && 'name' in option) {
      return { name: option.name, value: option.value };
    } else {
      return undefined;
    }
  }

  private sanitizeOptions(question: AutocompleteQuestion | CheckboxQuestion): OptionValue[] {
    const options = (question.options ?? []).map(option => this.getOptionValue(option));
    return options.filter(Boolean);
  }

  private filterOptions(options: OptionValue[], input: string): OptionValue[] {
    input = input.toLowerCase(); // Normalize input for case-insensitive comparison

    // Fuzzy matching: Check if all characters of the input can be found in the option name in order
    const fuzzyMatch = (option: string, input: string) => {
      if (!input || !input.trim().length) return true;
      const length = input.length;
      let position = 0; // Position in the input string

      // Iterate over each character in the option name
      for (let i = 0; i < option.length; i++) {
        if (option[i] === input[position]) {
          position++; // Move to the next character in the input
          if (position === length) { // Check if we've matched all characters
            return true;
          }
        }
      }
      return false;
    };

    return options
      .filter(option => fuzzyMatch(option.name.toLowerCase(), input))
      .sort((a, b) => {
        if (a.name < b.name) {
          return -1;
        }
        if (a.name > b.name) {
          return 1;
        }
        return 0;
      });
  }

  private getMaxLines(question: { maxDisplayLines?: number }, defaultLength: number): number {
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
  // NOTE: use exit() to close!
  public close() {
    if (this.rl) {
      this.rl.close();
      this.keypress.destroy();
    }
  }
}