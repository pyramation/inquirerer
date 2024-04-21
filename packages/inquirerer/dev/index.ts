#!/usr/bin/env node
import minimist from 'minimist';

import { Inquirerer } from "../src";
import { displayVersion } from '../src/utils';
import { Question } from '../src/question';

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
  
  const args2 = await prompter.promptCheckbox(argv, {
    name: 'name',
    maxDisplayLines: 8,
    returnFullResults: false,
    required: true,
    options: [
      'Apple', 'Apricot', 'Avocado', 
      'Banana', 'Blackberry', 'Blueberry', 'Boysenberry',
      'Cherry', 'Clementine', 'Coconut', 'Cranberry', 
      'Date', 'Durian',
      'Elderberry',
      'Fig',
      'Grape', 'Grapefruit', 'Guava',
      'Honeydew',
      'Kiwi', 'Kumquat',
      'Lemon', 'Lime', 'Lychee',
      'Mango', 'Melon', 'Mulberry',
      'Nectarine',
      'Orange',
      'Papaya', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plum', 'Pomegranate', 'Pomelo',
      'Quince',
      'Raspberry', 'Redcurrant',
      'Strawberry', 'Starfruit',
      'Tangerine',
      'Ugli Fruit',
      'Vanilla',
      'Watermelon',
      'Xigua (Chinese Watermelon)',
      'Yellow Plum',
      'Zucchini'
  ]
  });

  const question: Question = {
    name: 'fruitSearch',
    type: 'autocomplete',
    maxDisplayLines: 5,
    options: [
      'Apple', 'Apricot', 'Avocado', 
      'Banana', 'Blackberry', 'Blueberry', 'Boysenberry',
      'Cherry', 'Clementine', 'Coconut', 'Cranberry', 
      'Date', 'Durian',
      'Elderberry',
      'Fig',
      'Grape', 'Grapefruit', 'Guava',
      'Honeydew',
      'Kiwi', 'Kumquat',
      'Lemon', 'Lime', 'Lychee',
      'Mango', 'Melon', 'Mulberry',
      'Nectarine',
      'Orange',
      'Papaya', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plum', 'Pomegranate', 'Pomelo',
      'Quince',
      'Raspberry', 'Redcurrant',
      'Strawberry', 'Starfruit',
      'Tangerine',
      'Ugli Fruit',
      'Vanilla',
      'Watermelon',
      'Xigua (Chinese Watermelon)',
      'Yellow Plum',
      'Zucchini'
  ]
  
  };
  const args3 = await prompter.promptAutocomplete(question);

  console.log(args);
  console.log(args2);
  console.log(args3);

  prompter.close();
};

main();