import readline from 'readline';
import { Readable, Transform, Writable } from 'stream';
import stripAnsi from 'strip-ansi';

import { Inquirerer } from '../src';
import { Question } from '../src/question';

jest.mock('readline');

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const snap = (str: any) => expect(str).toMatchSnapshot();

describe('Inquirerer', () => {
  let mockWrite: jest.Mock;
  let mockInput: Readable;
  let mockOutput: Writable;
  let transformStream: Transform;

  let writeResults: string[];
  let transformResults: string[];

  let inputQueue: Array<{ type: 'key' | 'read', value: string }> = [];
  let currentInputIndex: number = 0;

  function setupReadlineMock() {
    readline.createInterface = jest.fn().mockReturnValue({
      question: (questionText: string, cb: (input: string) => void) => {
        // Process the queued inputs when question is called
        const nextInput = inputQueue[currentInputIndex++];
        if (nextInput && nextInput.type === 'read') {
          setTimeout(() => cb(nextInput.value), 350); // Simulate readline delay
        }
      },
      close: jest.fn(),
    });
  }

  function enqueueInputResponse(input: { type: 'key' | 'read', value: string }) {
    if (input.type === 'key') {
      // Push key events directly to mockInput
      // @ts-ignore
      setTimeout(() => mockInput.push(input.value), 350);
    } else {
      // Queue readline responses to be handled by the readline mock
      inputQueue.push(input);
    }
  }

  const KEY_SEQUENCES = {
    ENTER: '\u000d',     // Carriage return
    UP_ARROW: '\u001b[A', // ANSI escape sequence for the up arrow
    DOWN_ARROW: '\u001b[B',
    SPACE: ' '
  };

  beforeEach(() => {
    mockWrite = jest.fn();
    writeResults = [];
    transformResults = [];


    mockInput = new Readable({
      read(size) { }
    });
    // @ts-ignore
    mockInput.setRawMode = jest.fn();  // Mock TTY-specific method if needed

    mockOutput = new Writable({
      write: (chunk, encoding, callback) => {
        const str = chunk.toString();
        writeResults.push(stripAnsi(str));
        mockWrite(str);
        callback();
      }
    });

    // Create the transform stream to log and pass through data
    transformStream = new Transform({
      transform(chunk, encoding, callback) {
        const data = chunk.toString();
        transformResults.push(stripAnsi(data));
        this.push(chunk); // Pass the data through
        callback();
      }
    });

    setupReadlineMock();
    // Pipe the transform stream to the mock output to intercept writes
    //  transformStream.pipe(mockOutput);

    // mockOutput.pipe(transformStream);
    mockInput.pipe(transformStream);

    // mockInput.pipe(transformStream).pipe(mockOutput);

  });

  it('prompts user and correctly processes delayed input', async () => {
    enqueueInputResponse({ type: 'read', value: 'user input' });

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [{ name: 'username', type: 'text' }];
    const initialParams = {};

    const expectedResult = { username: 'user input' };

    const result = await prompter.prompt(initialParams, questions);

    expect(result).toEqual(expectedResult);
    // expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('username:\n> '));
    snap(writeResults);
    snap(transformResults);
  });

  it('handles multiple questions', async () => {
    enqueueInputResponse({ type: 'read', value: 'first question answer' });
    enqueueInputResponse({ type: 'read', value: 'second question answer' });

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [
      { name: 'firstQuestion', type: 'text' },
      { name: 'secondQuestion', type: 'text' }
    ];
    const initialParams = {};

    const result = await prompter.prompt(initialParams, questions);

    expect(result).toEqual({
      firstQuestion: 'first question answer',
      secondQuestion: 'second question answer'
    });
    snap(writeResults);
    snap(transformResults);
  });

  it('handles combined key events and readline inputs', async () => {

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [
      { name: 'firstQuestion', type: 'text' },
      { name: 'secondQuestion', type: 'text' }
    ];
    const initialParams = {};

    enqueueInputResponse({ type: 'read', value: 'first question answer' });
    // enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    // enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER }); // Simulate Enter
    enqueueInputResponse({ type: 'read', value: 'second question answer' });

    const result = await prompter.prompt(initialParams, questions);



    expect(result).toEqual({
      firstQuestion: 'first question answer',
      secondQuestion: 'second question answer'
    });
  });

  it('checkbox', async () => {

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [
      {
        name: 'checkbox', type: 'checkbox', options: [
          'a',
          'b',
          'c'
        ]
      }
    ];
    const initialParams = {};

    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.SPACE }); // Space to select
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.SPACE }); // Space to select
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER }); // Simulate Enter

    const result = await prompter.prompt(initialParams, questions);

    snap(result);
  });

  it('checkbox w/options', async () => {

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [
      {
        name: 'checkbox',
        type: 'checkbox',
        options: [
          'a',
          'b',
          'c'
        ],
        returnFullResults: true
      }
    ];
    const initialParams = {};

    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.SPACE }); // Space to select
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.SPACE }); // Space to select
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER }); // Simulate Enter

    const result = await prompter.prompt(initialParams, questions);

    snap(result);
  });

  it('handles readline inputs', async () => {

    const prompter = new Inquirerer({
      input: mockInput,
      output: mockOutput,
      noTty: false
    });
    const questions: Question[] = [
      { name: 'firstQuestion', type: 'text' },
      { name: 'secondQuestion', type: 'text' },
      { name: 'youGotIt', type: 'confirm' },
      { name: 'andGotIt', type: 'confirm' },
    ];
    const initialParams = {};

    enqueueInputResponse({ type: 'read', value: 'first question answer' });
    // enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW }); // Simulate Down Arrow
    // enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER }); // Simulate Enter
    enqueueInputResponse({ type: 'read', value: 'second question answer' });
    enqueueInputResponse({ type: 'read', value: 'Y' });
    enqueueInputResponse({ type: 'read', value: 'N' });

    const result = await prompter.prompt(initialParams, questions);



    expect(result).toEqual({
      firstQuestion: 'first question answer',
      secondQuestion: 'second question answer',
      youGotIt: true,
      andGotIt: false
    });
  });

});
