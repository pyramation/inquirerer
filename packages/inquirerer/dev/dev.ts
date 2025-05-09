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

if (argv.version) {
  displayVersion();
  process.exit(0);
}

const prompter = new Inquirerer({
  noTty: !argv.tty
});

const main = async () => {
  // const args = await prompter.prompt(argv, [
  //   {
  //     name: 'name'
  //   },
  //   {
  //     name: 'flower'
  //   }
  // ]);
  
  // const args2 = await prompter.checkbox({
  //   name: 'name',
  //   maxDisplayLines: 8,
  //   returnFullResults: false,
  //   required: true,
  //   options: [
  //     'Apple', 'Apricot', 'Avocado', 
  //     'Banana', 'Blackberry', 'Blueberry', 'Boysenberry',
  //     'Cherry', 'Clementine', 'Coconut', 'Cranberry', 
  //     'Date', 'Durian',
  //     'Elderberry',
  //     'Fig',
  //     'Grape', 'Grapefruit', 'Guava',
  //     'Honeydew',
  //     'Kiwi', 'Kumquat',
  //     'Lemon', 'Lime', 'Lychee',
  //     'Mango', 'Melon', 'Mulberry',
  //     'Nectarine',
  //     'Orange',
  //     'Papaya', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plum', 'Pomegranate', 'Pomelo',
  //     'Quince',
  //     'Raspberry', 'Redcurrant',
  //     'Strawberry', 'Starfruit',
  //     'Tangerine',
  //     'Ugli Fruit',
  //     'Vanilla',
  //     'Watermelon',
  //     'Xigua (Chinese Watermelon)',
  //     'Yellow Plum',
  //     'Zucchini'
  // ]
  // });

  const regex: Question[] = [
    {
      name: 'email',
      type: 'text',
      message: 'Enter your email:',
      pattern: '^([a-zA-Z0-9_\\-\\.]+)@([a-zA-Z0-9_\\-\\.]+)\\.([a-zA-Z]{2,5})$',
      required: true
    },
    {
      name: 'website',
      type: 'text',
      message: 'Enter your website URL:',
      pattern: '^(http|https)://[a-zA-Z0-9-\\.]+\\.[a-zA-Z]{2,5}(/[a-zA-Z0-9-._~:/?#[\\]@!$&\'()*+,;=]*)?$',
      required: false
    }
  ];

  const p = await prompter.prompt({}, regex);
  console.log(p);

  const question: Question = {
    name: 'fruitSearch',
    type: 'autocomplete',
    maxDisplayLines: 15,
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
  const args3 = await prompter.prompt({}, [question]);

  // console.log(args);
  // console.log(args2);
  console.log(args3);


  const massive = await prompter.prompt({},  [
    question,
    {
      type: 'text',
      name: 'first',
      message: 'Enter your first name'
    },
    {
      type: 'text',
      name: 'last',
      required: true,
      message: 'Enter your last name'
    },
    // {
    //   ...question,
    //   name: 'autocomp',
    //   type: 'autocomplete',
    //   message: 'Enter your completion',
    // },
    // {
    //   ...question,
    //   name: 'this_is_NOT_required',
    //   type: 'checkbox',
    //   required: true
    // },
    // {
    //   ...question,
    //   name: 'this_is_required',
    //   type: 'checkbox',
    //   required: true
    // },
    // {
    //   name: 'searcher',
    //   type: 'autocomplete',
    //   options: [
    //     'Apple', 'Apricot', 'Avocado', 
    //     'Banana', 'Blackberry', 'Blueberry', 'Boysenberry',
    //     'Cherry', 'Clementine', 'Coconut', 'Cranberry', 
    //     'Date', 'Durian',
    //     'Elderberry',
    //     'Fig',
    //     'Grape', 'Grapefruit', 'Guava',
    //     'Honeydew',
    //     'Kiwi', 'Kumquat',
    //     'Lemon', 'Lime', 'Lychee',
    //     'Mango', 'Melon', 'Mulberry',
    //     'Nectarine',
    //     'Orange',
    //     'Papaya', 'Peach', 'Pear', 'Persimmon', 'Pineapple', 'Plum', 'Pomegranate', 'Pomelo',
    //     'Quince',
    //     'Raspberry', 'Redcurrant',
    //     'Strawberry', 'Starfruit',
    //     'Tangerine',
    //     'Ugli Fruit',
    //     'Vanilla',
    //     'Watermelon',
    //     'Xigua (Chinese Watermelon)',
    //     'Yellow Plum',
    //     'Zucchini'
    //   ]
    // },
    {
      name: 'text',
      type: 'text'
    },
    {
      name: 'num',
      type: 'number'
    },
    {
      name: 'num2',
      type: 'number',
      default: 2
    },
    {
      name: 'confirm',
      type: 'confirm'
    },
    {
      name: 'autocomplete',
      type: 'autocomplete',
      options: [
        { name: 'Apple', value: 'Fruit01' },
        { name: 'Banana', value: 'Fruit02' },
        { name: 'Cherry', value: 'Fruit03' },
        { name: 'Grape', value: 'Fruit04' },
        { name: 'Mango', value: 'Fruit05' }
      ]
    },
    {
      name: 'checkbox',
      type: 'checkbox',
      required: true,
      options: [
        { name: 'RApple', value: 'Fruit01' },
        { name: 'RBanana', value: 'Fruit02' },
        { name: 'RCherry', value: 'Fruit03' },
        { name: 'RGrape', value: 'Fruit04' },
        { name: 'RMango', value: 'Fruit05' }
      ]
    },
    {
      name: 'autocomplete2',
      type: 'autocomplete',
      options: [
        { name: 'Apple', value: 'Fruit01' },
        { name: 'Banana', value: 'Fruit02' },
        { name: 'Cherry', value: 'Fruit03' },
        { name: 'Grape', value: 'Fruit04' },
        { name: 'Mango', value: 'Fruit05' }
      ]
    },
    {
      name: 'checkbox2',
      type: 'checkbox',
      options: [
        { name: 'Apple', value: 'Fruit01' },
        { name: 'Banana', value: 'Fruit02' },
        { name: 'Cherry', value: 'Fruit03' },
        { name: 'Grape', value: 'Fruit04' },
        { name: 'Mango', value: 'Fruit05' }
      ]
    }
    
  ])
  console.log(JSON.stringify(massive, null, 2))
  prompter.close();
};

main();