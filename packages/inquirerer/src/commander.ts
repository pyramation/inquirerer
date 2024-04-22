import deepmerge from 'deepmerge';
import minimist, { Opts, ParsedArgs } from 'minimist';
import { Readable,Writable } from 'stream';

import { Inquirerer } from './prompt';
import { getVersion } from './utils';

// Define the type for the command handler function
export type CommandHandler = (argv: ParsedArgs, prompter: Inquirerer, options: CLIOptions) => void;

export interface CLIOptions {
  noTty: boolean;
  input: Readable;
  output: Writable;
  minimistOpts: Opts;
  version: string;
}

export const defaultCLIOptions: CLIOptions = {
  version: `inquirerer@${getVersion()}`,
  noTty: false,
  input: process.stdin,
  output: process.stdout,
  minimistOpts: {
    alias: {
      v: 'version'
    }
  }
};

export class CLI {
  private argv: ParsedArgs;
  private prompter: Inquirerer;
  private commandHandler: CommandHandler;
  private options: CLIOptions;

  constructor(
    commandHandler: CommandHandler,
    options: Partial<CLIOptions>
  ) {
    const { input, output, ...optionsWithoutIO } = options;
    const { input: defaultInput, output: defaultOutput, ...defaultOptionsWithoutIO } = defaultCLIOptions;
    const mergedOptions: Partial<CLIOptions> = deepmerge(defaultOptionsWithoutIO, optionsWithoutIO);
    mergedOptions.input = input || defaultInput;
    mergedOptions.output = output || defaultOutput;
    this.options = mergedOptions as CLIOptions;

    this.argv = minimist(process.argv.slice(2), this.options.minimistOpts);
    this.prompter = new Inquirerer();
    this.commandHandler = commandHandler;
  }

  public run(): void {
    if (!('tty' in this.argv)) {
      this.argv.tty = true;
    }

    if (this.argv.version) {
      console.log(this.options.version);
      process.exit(0);
    }

    this.commandHandler(this.argv, this.prompter, this.options);
    this.prompter.close();
  }
}

export default CLI;
