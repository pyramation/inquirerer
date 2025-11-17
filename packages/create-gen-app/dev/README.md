# Development Script

This script helps you test `create-gen-app` locally with the pgpm-boilerplates repository.

## Usage

From the `packages/create-gen-app` directory, run:

```bash
yarn dev
```

or

```bash
npm run dev
```

## What it does

1. **Clones the default repository**: `https://github.com/launchql/pgpm-boilerplates/`
2. **Lists available templates**: Scans the root directory (`.`) for folders (e.g., `module`, `workspace`)
3. **Prompts for selection**: Uses `inquirerer` to display an interactive list of templates
4. **Processes the template**:
   - Extracts variables from the selected folder
   - Discovers the `.questions.json` file if present
   - Prompts for variable values
   - Copies and processes files with replacements
5. **Generates output**: Creates the processed project in `./test-output`

## Configuration

You can modify these constants in `dev/index.ts`:

- `DEFAULT_REPO`: The repository URL to clone (default: `https://github.com/launchql/pgpm-boilerplates/`)
- `DEFAULT_DIRECTORY`: The directory within the repo to scan for templates (default: `.`)
- `OUTPUT_DIR`: Where to generate the output (default: `./test-output`)

## Example

```bash
$ yarn dev
🚀 create-gen-app development script

Cloning template from https://github.com/launchql/pgpm-boilerplates/...

Found 2 template(s): module, workspace

Which template would you like to use?
> module
  workspace

You selected: module

Extracting template variables...
...
✅ Project created successfully!
📁 Output directory: /path/to/test-output
```

## Notes

- The `test-output` directory is gitignored
- The temporary clone directory is automatically cleaned up after generation
- You can test different templates without affecting your workspace
