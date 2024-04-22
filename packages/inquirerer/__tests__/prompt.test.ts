import readline from 'readline';
import { Readable, Writable, Transform } from 'stream';


import { Inquirerer } from '../src';
import { Question } from '../src/question';

jest.mock('readline');

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
        writeResults.push(str);
        mockWrite(str);
        callback();
      }
    });

    // Create the transform stream to log and pass through data
    transformStream = new Transform({
      transform(chunk, encoding, callback) {
        const data = chunk.toString();
        transformResults.push(data);
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

    const prompter = new Inquirerer(false, mockInput, mockOutput);
    const questions: Question[] = [{ name: 'username', type: 'text' }];
    const initialParams = {};

    const expectedResult = { username: 'user input' };

    const result = await prompter.prompt(initialParams, questions);

    expect(result).toEqual(expectedResult);
    // expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('username:\n> '));
    expect(writeResults).toMatchSnapshot();
    expect(transformResults).toMatchSnapshot();
  });

  it('handles multiple questions', async () => {
    enqueueInputResponse({ type: 'read', value: 'first question answer' });
    enqueueInputResponse({ type: 'read', value: 'second question answer' });

    const prompter = new Inquirerer(false, mockInput, mockOutput);
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
    expect(writeResults).toMatchSnapshot();
    expect(transformResults).toMatchSnapshot();
  });

  xit('handles autocomplete selection with key events', async () => {
    // Simulate typing 'fir', navigating down to the second option, and selecting it
    // enqueueInputResponse({ type: 'read', value: 'fir' });
    // enqueueInputResponse({ type: 'key', value: 'DOWN_ARROW' });

    const prompter = new Inquirerer(false, mockInput, mockOutput);
    const questions: Question[] = [{
      name: 'autocompleteField',
      type: 'autocomplete',
      options: ['first option', 'firry second option', 'firry third option']
    }];
    const initialParams = {};

    enqueueInputResponse({ type: 'key', value: 'f' });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.DOWN_ARROW });
    enqueueInputResponse({ type: 'key', value: KEY_SEQUENCES.ENTER });

    const result = await prompter.prompt(initialParams, questions);

    // Expected to select the second option
    expect(result).toEqual({ autocompleteField: 'second option' });
    expect(writeResults).toMatchSnapshot();
    expect(transformResults).toMatchSnapshot();
  });

  it('handles combined key events and readline inputs', async () => {

    const prompter = new Inquirerer(false, mockInput, mockOutput);
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

    const prompter = new Inquirerer(false, mockInput, mockOutput);
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

    expect(result).toMatchSnapshot();
  });

  it('checkbox w/options', async () => {

    const prompter = new Inquirerer(false, mockInput, mockOutput);
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

    expect(result).toMatchSnapshot();
  });

  it('handles readline inputs', async () => {

    const prompter = new Inquirerer(false, mockInput, mockOutput);
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
