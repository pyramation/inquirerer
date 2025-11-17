import * as fs from 'fs';
import * as path from 'path';
import { Inquirerer, ListQuestion } from 'inquirerer';
import { cloneRepo } from '../src/clone';
import { extractVariables } from '../src/extract';
import { promptUser } from '../src/prompt';
import { replaceVariables } from '../src/replace';

const DEFAULT_REPO = 'https://github.com/launchql/pgpm-boilerplates/';
const DEFAULT_DIRECTORY = '.';
const OUTPUT_DIR = './test-output';

async function main() {
  console.log('🚀 create-gen-app development script\n');

  try {
    // Clone the default repository
    console.log(`Cloning template from ${DEFAULT_REPO}...`);
    const tempDir = await cloneRepo(DEFAULT_REPO);

    // List folders in the repository
    const templateDir = path.join(tempDir, DEFAULT_DIRECTORY);
    const folders = fs.readdirSync(templateDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
      .map(dirent => dirent.name);

    if (folders.length === 0) {
      throw new Error('No template folders found in repository');
    }

    console.log(`\nFound ${folders.length} template(s): ${folders.join(', ')}\n`);

    // Use inquirerer to prompt for folder selection
    const inquirerer = new Inquirerer();
    const question: ListQuestion = {
      type: 'list',
      name: 'template',
      message: 'Which template would you like to use?',
      options: folders,
      required: true
    };

    const answers = await inquirerer.prompt({}, [question]) as { template: string };
    // inquirerer.close();

    const selectedFolder = answers.template;
    console.log(`\nYou selected: ${selectedFolder}\n`);

    // Use the selected folder as the template source
    const selectedTemplateDir = path.join(templateDir, selectedFolder);

    console.log('Extracting template variables...');
    const extractedVariables = await extractVariables(selectedTemplateDir);

    console.log(`Found ${extractedVariables.fileReplacers.length} file replacers`);
    console.log(`Found ${extractedVariables.contentReplacers.length} content replacers`);
    if (extractedVariables.projectQuestions) {
      console.log(`Found ${extractedVariables.projectQuestions.questions.length} project questions`);
    }

    console.log('\nPrompting for variable values...');
    const variableAnswers = await promptUser(extractedVariables, {}, false);

    // Ensure output directory exists
    const absoluteOutputDir = path.resolve(OUTPUT_DIR);
    if (fs.existsSync(absoluteOutputDir)) {
      console.log(`\nRemoving existing output directory: ${absoluteOutputDir}`);
      fs.rmSync(absoluteOutputDir, { recursive: true, force: true });
    }

    console.log(`\nGenerating project in ${absoluteOutputDir}...`);
    await replaceVariables(selectedTemplateDir, absoluteOutputDir, extractedVariables, variableAnswers);

    console.log('\n✅ Project created successfully!');
    console.log(`📁 Output directory: ${absoluteOutputDir}\n`);

    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main();
