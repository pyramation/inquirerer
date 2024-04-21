#!/usr/bin/env node
import minimist from 'minimist';
import { Inquirerer } from "../src";
import { displayVersion } from '../src/utils';

const argv = minimist(process.argv.slice(2), {
    alias: {
      v: 'version'
    }
  });
  
  if (!('tty' in argv)) {
    argv.tty = true;
}


if (argv.version) {
    displayVersion();
    process.exit(0);
  }
  
const prompter = new Inquirerer();

const main = async () => {
    const args = await prompter.prompt(argv, [
        {
            name: 'name'
        },
        {
            name: 'flower'
        }
    ]);

    console.log(args);

    prompter.close();
};

main();