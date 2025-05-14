#!/usr/bin/env node
import minimist from 'minimist';

import { Inquirerer } from "../src";
import { AutocompleteQuestion, ConfirmQuestion, Question } from '../src/question';
import { displayVersion } from '../src/utils';

const argv = minimist(process.argv.slice(2), {
  alias: {
    v: 'version'
  }
});

if (!('tty' in argv)) {
  argv.tty = true;
}

console.log(argv);

// argv.checkbox = ['RBanana'];
// argv.checkbox = ['RBanana', 'RCherry'];

if (argv.version) {
  displayVersion();
  process.exit(0);
}

const prompter = new Inquirerer({
  noTty: !argv.tty
});

const main = async () => {

  const massive = await prompter.prompt(argv,  [
    // {
    //   name: 'num2',
    //   type: 'number',
    //   message: 'Db enterprises?',
    //   description: 'here is a field for whatever.',
    //   default: 2
    // },
    // {
    //   name: 'text2',
    //   type: 'text',
    //   description: 'here is a field for whatever.',
    //   default: 'tex'
    // },
    {
      name: 'checkbox',
      type: 'checkbox',
      required: true,
      // default: ['RBanana', 'RCherry'],
      options: ['RBanana', 'RCherry']
    },
    // {
    //   name: 'checkbox',
    //   type: 'checkbox',
    //   required: true,
    //   default: ['RBanana', 'RCherry'],
    //   options: [
    //     { name: 'RApple', value: 'Fruit01' },
    //     { name: 'RBanana', value: 'Fruit02' },
    //     { name: 'RCherry', value: 'Fruit03' },
    //     { name: 'RGrape', value: 'Fruit04' },
    //     { name: 'RMango', value: 'Fruit05' }
    //   ]
    // },
    // {
    //   name: 'list',
    //   type: 'list',
    //   required: true,
    //   default: ['RCherry'],
    //   options: [
    //     { name: 'RApple', value: 'Fruit01' },
    //     { name: 'RBanana', value: 'Fruit02' },
    //     { name: 'RCherry', value: 'Fruit03' },
    //     { name: 'RGrape', value: 'Fruit04' },
    //     { name: 'RMango', value: 'Fruit05' }
    //   ]
    // },
    // {
    //   name: 'autocomplete',
    //   type: 'autocomplete',
    //   required: true,
    //   default: ['RGrape'],
    //   options: [
    //     { name: 'RApple', value: 'Fruit01' },
    //     { name: 'RBanana', value: 'Fruit02' },
    //     { name: 'RCherry', value: 'Fruit03' },
    //     { name: 'RGrape', value: 'Fruit04' },
    //     { name: 'RMango', value: 'Fruit05' }
    //   ]
    // },
  ])
  console.log(JSON.stringify(massive, null, 2))
  prompter.close();
};

main();