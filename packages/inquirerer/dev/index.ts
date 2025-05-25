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
// argv.checkbox = ['Banana'];
// argv.checkbox = ['Banana', 'Cherry', 'Blos'];

if (argv.version) {
  displayVersion();
  process.exit(0);
}

const prompter = new Inquirerer({
  noTty: !argv.tty
});

let after = {};
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
      allowCustomOptions: true,
      returnFullResults: true,
      options: [
        'Banana',
        'Cherry',
        'Grape'
      ]
    },
    {
      name: 'testme',
      type: 'text',
      dependsOn: ['checkbox'],
      when: (answers) => {
        const res = answers.checkbox?.find((a: any) => a.name === 'Banana');
        return !!(res && res.selected);
      }
    }
  ])
  console.log(JSON.stringify(massive, null, 2))
  console.log(JSON.stringify(after, null, 2))
  prompter.close();
};

main();