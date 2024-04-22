import readline from 'readline';
import { Readable, Writable, Transform } from 'stream';

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
  let questionHandlers: Array<(input: string) => void> = [];
  let currentQuestionIndex: number = 0;
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
    currentQuestionIndex = 0;
    questionHandlers = [];
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

  it('handles autocomplete selection with key events', async () => {
    const prompter = new Inquirerer(false, mockInput, mockOutput);
    const questions: Question[] = [{
      name: 'autocompleteField',
      type: 'autocomplete',
      options: ['first option', 'firry second option', 'firry third option']
    }];
    const initialParams = {};

    enqueueInputResponse({ type: 'read', value: 'fir' });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER });

    const result = await prompter.prompt(initialParams, questions);

    // Expected to select the second option
    // expect(result).toEqual({ autocompleteField: 'second option' });
    snap({result});
    snap(writeResults);
    snap(transformResults);
  });


});
