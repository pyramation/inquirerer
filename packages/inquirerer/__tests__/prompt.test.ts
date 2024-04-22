import readline from 'readline';
import { Readable, Writable } from 'stream';

import { Inquirerer } from '../src'; // Ensure correct import path
import { Question } from '../src/question'; // Assuming you have a type for questions

jest.mock('readline');

describe('Inquirerer', () => {
  let mockWrite: jest.Mock;
  let mockInput: Readable;
  let mockOutput: Writable;

  beforeEach(() => {
    mockWrite = jest.fn();

    // Create a mock input stream with a setRawMode method
    mockInput = new Readable({
      read(size) {}
    });
    // @ts-ignore to add non-standard method
    mockInput.setRawMode = jest.fn();

    // Create a mock output stream
    mockOutput = new Writable({
      write: (chunk, encoding, callback) => {
        mockWrite(chunk.toString());
        callback();
      }
    });

    readline.createInterface = jest.fn().mockReturnValue({
      question: (questionText: string, cb: (input: string) => void) => {
        setTimeout(() => cb('user input'), 350); // simulate user delay
      },
      close: jest.fn(),
    });
  });

  it('prompts user and correctly processes delayed input', async () => {
    const prompter = new Inquirerer(false, mockInput, mockOutput);
    const questions: Question[] = [{ name: 'username', type: 'text' }];
    const initialParams = {};

    const expectedResult = { username: 'user input' };

    const result = await new Promise(resolve => {
      setTimeout(() => {
        prompter.prompt(initialParams, questions).then(resolve);
      }, 1100); // Wait slightly longer than the readline delay to ensure input is received
    });

    expect(result).toEqual(expectedResult);
    // expect(mockWrite).toHaveBeenCalledWith(expect.stringContaining('username:\n> '));
  });
});
