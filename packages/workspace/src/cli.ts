import { parseArgs } from 'node:util';

import {
  runWorkspace,
  WorkspaceGenerationError,
  type RunWorkspaceOptions,
  type WorkspaceRunResult,
} from './run-workspace.js';

const HELP = `Usage: formly-contracts generate [options]

Generate deterministic Form Contract artifacts for a configured workspace.

Options:
  --workspace-root <path>  Workspace root (default: current directory)
  --config <path>          Root config path (default: formly-contracts.config.ts)
  --output <path>          Override the workspace-relative output directory
  --fail-on <severity>     Fail on warning or error; may be repeated
  -h, --help               Show this help
`;

interface CliWriter {
  write(value: string): unknown;
}

type GenerateWorkspace = (
  options: RunWorkspaceOptions,
) => Promise<Pick<WorkspaceRunResult, 'indexPath' | 'artifactPaths'>>;

export interface WorkspaceCliDependencies {
  readonly cwd?: () => string;
  readonly stdout?: CliWriter;
  readonly stderr?: CliWriter;
  readonly generate?: GenerateWorkspace;
}

interface ParsedGenerateCommand {
  readonly workspaceRoot: string;
  readonly rootConfigPath: string;
  readonly outputDirectory?: string;
  readonly failOn?: readonly ('warning' | 'error')[];
}

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CliUsageError';
  }
}

function parseFailOn(values: readonly string[] | undefined) {
  if (values === undefined) {
    return undefined;
  }
  const parsed: ('warning' | 'error')[] = [];
  for (const value of values) {
    if (value !== 'warning' && value !== 'error') {
      throw new CliUsageError('--fail-on must be warning or error.');
    }
    if (parsed.includes(value)) {
      throw new CliUsageError('--fail-on must not contain duplicates.');
    }
    parsed.push(value);
  }
  return parsed;
}

function parseGenerateCommand(
  argv: readonly string[],
  cwd: () => string,
): ParsedGenerateCommand | 'help' {
  let parsed;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      strict: true,
      options: {
        'workspace-root': { type: 'string' },
        config: { type: 'string' },
        output: { type: 'string' },
        'fail-on': { type: 'string', multiple: true },
        help: { type: 'boolean', short: 'h' },
      },
    });
  } catch {
    throw new CliUsageError('Invalid command-line arguments.');
  }

  if (parsed.values.help === true) {
    return 'help';
  }
  if (
    parsed.positionals.length !== 1 ||
    parsed.positionals[0] !== 'generate'
  ) {
    throw new CliUsageError('The generate command is required.');
  }
  const failOn = parseFailOn(parsed.values['fail-on']);

  return {
    workspaceRoot: parsed.values['workspace-root'] ?? cwd(),
    rootConfigPath:
      parsed.values.config ?? 'formly-contracts.config.ts',
    ...(parsed.values.output === undefined
      ? {}
      : { outputDirectory: parsed.values.output }),
    ...(failOn === undefined ? {} : { failOn }),
  };
}

function formatGenerationError(error: WorkspaceGenerationError): string {
  const provenance = [
    `phase=${error.phase}`,
    ...(error.projectId === undefined ? [] : [`project=${error.projectId}`]),
    ...(error.sourceId === undefined ? [] : [`source=${error.sourceId}`]),
    ...(error.formId === undefined ? [] : [`form=${error.formId}`]),
    ...(error.outputPath === undefined
      ? []
      : [`output=${JSON.stringify(error.outputPath)}`]),
  ].join(' ');
  return `Generation failed [${error.code}] ${provenance}\n${error.message}\n`;
}

export async function runWorkspaceCli(
  argv: readonly string[],
  dependencies: WorkspaceCliDependencies = {},
): Promise<number> {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const generate = dependencies.generate ?? runWorkspace;
  const cwd = dependencies.cwd ?? (() => process.cwd());

  let command: ParsedGenerateCommand | 'help';
  try {
    command = parseGenerateCommand(argv, cwd);
  } catch (error) {
    if (error instanceof CliUsageError) {
      stderr.write(`Usage error: ${error.message}\nRun formly-contracts --help.\n`);
      return 2;
    }
    stderr.write('Usage error: Invalid command-line arguments.\n');
    return 2;
  }

  if (command === 'help') {
    stdout.write(HELP);
    return 0;
  }

  try {
    const result = await generate({
      workspaceRoot: command.workspaceRoot,
      rootConfigPath: command.rootConfigPath,
      ...(command.outputDirectory === undefined && command.failOn === undefined
        ? {}
        : {
            cliOverrides: {
              ...(command.outputDirectory === undefined
                ? {}
                : { outputDirectory: command.outputDirectory }),
              ...(command.failOn === undefined
                ? {}
                : { failOn: command.failOn }),
            },
          }),
    });
    const count = result.artifactPaths.length;
    stdout.write(
      `Generated ${count} ${count === 1 ? 'contract' : 'contracts'}.\nIndex: ${result.indexPath}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof WorkspaceGenerationError) {
      stderr.write(formatGenerationError(error));
      return 1;
    }
    stderr.write('Generation failed [UNEXPECTED]\nWorkspace generation failed.\n');
    return 1;
  }
}
