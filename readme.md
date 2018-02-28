# Inquirerer

A wrapper around Inquirer to solve this issue: https://github.com/SBoudrias/Inquirer.js/issues/166

Allows you to override properties passed in, and won't be asked interactively. This is huge when creating real production systems where scripts need to run automatically without human interaction.

## override properties

Imagine this exists in a file `myprogram.js`:

```js
import { prompt } from 'inquirer';
var argv = require('minimist')(process.argv.slice(2));

const questions = [
  {
    name: 'database',
    message: 'database',
    required: true,
  },
];

const { database } = await prompt(questions, argv);
```

To run interactively, just run `node myprogram.js`. However, if you want to override, simply do:

```sh
node myprogram.js --database mydb1
```

And will skip the interactive phase, unless more questions are unanswered.

## `_` properties

If you set `_: true`, then you can pass an argument into the system and it won't need the parameter name. Reasoning is many libraries such as `minimist` use `_` to store properties that aren't flagged.

```js
const questions = [
  {
    name: 'database',
    message: 'database',
    required: true,
  },
];

const { database } = await prompt(questions, argv);
```

Now you can run with or without the `--database` flag

```sh
node myprogram.js mydb1
```

or equivalently:

```sh
node myprogram.js --database mydb1
```
