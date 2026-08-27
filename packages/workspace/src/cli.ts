import { parseArgs } from 'node:util';

import { WorkspaceConfigLoadError } from './config-loader.js';
import {
  discoverWorkspaceProjects,
  type DiscoveredWorkspace,
  type DiscoverWorkspaceProjectsOptions,
} from './discover-projects.js';
import {
  checkWorkspace,
  runWorkspace,
  WorkspaceGenerationError,
  type RunWorkspaceOptions,
  type WorkspaceCheckResult,
  type WorkspaceRunResult,
} from './run-workspace.js';

const HELP = `Usage: formly-contracts <command> [options]

Commands:
  generate  Write deterministic Form Contract artifacts
  list      List configured projects and sources without running form factories
  check     Verify generated artifacts are current without writing them

Options:
  --workspace-root <path>  Workspace root (default: current directory)
  --config <path>          Root config path (default: formly-contracts.config.ts)
  --output <path>          Override output for generate or check
  --fail-on <severity>     Fail on warning or error; generate or check only
  -h, --help               Show this help
`;

interface CliWriter {
  write(value: string): unknown;
}

type GenerateWorkspace = (
  options: RunWorkspaceOptions,
) => Promise<Pick<WorkspaceRunResult, 'indexPath' | 'artifactPaths'>>;
type ListWorkspace = (
  options: DiscoverWorkspaceProjectsOptions,
) => Promise<Pick<DiscoveredWorkspace, 'inventory'>>;
type CheckWorkspace = (
  options: RunWorkspaceOptions,
) => Promise<WorkspaceCheckResult>;

export interface WorkspaceCliDependencies {
  readonly cwd?: () => string;
  readonly stdout?: CliWriter;
  readonly stderr?: CliWriter;
  readonly generate?: GenerateWorkspace;
  readonly list?: ListWorkspace;
  readonly check?: CheckWorkspace;
}

type WorkspaceCliCommandName = 'generate' | 'list' | 'check';

interface ParsedWorkspaceCommand {
  readonly name: WorkspaceCliCommandName;
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

function parseWorkspaceCommand(
  argv: readonly string[],
  cwd: () => string,
): ParsedWorkspaceCommand | 'help' {
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
  if (parsed.positionals.length !== 1) {
    throw new CliUsageError('Exactly one command is required.');
  }
  const name = parsed.positionals[0];
  if (name !== 'generate' && name !== 'list' && name !== 'check') {
    throw new CliUsageError(`Unsupported command: ${name}`);
  }
  if (
    name === 'list' &&
    (parsed.values.output !== undefined ||
      parsed.values['fail-on'] !== undefined)
  ) {
    throw new CliUsageError(
      'The list command does not accept --output or --fail-on.',
    );
  }
  const failOn = parseFailOn(parsed.values['fail-on']);

  return {
    name,
    workspaceRoot: parsed.values['workspace-root'] ?? cwd(),
    rootConfigPath:
      parsed.values.config ?? 'formly-contracts.config.ts',
    ...(parsed.values.output === undefined
      ? {}
      : { outputDirectory: parsed.values.output }),
    ...(failOn === undefined ? {} : { failOn }),
  };
}

function formatWorkspaceError(
  operation: 'Generation' | 'Check',
  error: WorkspaceGenerationError,
): string {
  const provenance = [
    `phase=${error.phase}`,
    ...(error.projectId === undefined ? [] : [`project=${error.projectId}`]),
    ...(error.sourceId === undefined ? [] : [`source=${error.sourceId}`]),
    ...(error.formId === undefined ? [] : [`form=${error.formId}`]),
    ...(error.outputPath === undefined
      ? []
      : [`output=${JSON.stringify(error.outputPath)}`]),
  ].join(' ');
  const hint = configLoadHint(error);
  return `${operation} failed [${error.code}] ${provenance}\n${error.message}\n${hint}`;
}

function configLoadHint(error: WorkspaceGenerationError): string {
  if (
    error.code !== 'WORKSPACE_DISCOVERY_FAILED' ||
    !(error.cause instanceof WorkspaceConfigLoadError) ||
    error.cause.code !== 'CONFIG_LOAD_FAILED'
  ) {
    return '';
  }
  return (
    'Hint: verify tsconfigPath and import a Node-safe contracts entry point; ' +
    'Angular browser barrels may require a dedicated contracts shim.\n'
  );
}

function workspaceOptions(
  command: ParsedWorkspaceCommand,
): RunWorkspaceOptions {
  return {
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
  };
}

function formatInventory(
  inventory: DiscoveredWorkspace['inventory'],
): string {
  const sourceCount = inventory.projects.reduce(
    (count, project) => count + project.sourceIds.length,
    0,
  );
  const projectLabel = inventory.projects.length === 1 ? 'project' : 'projects';
  const sourceLabel = sourceCount === 1 ? 'source' : 'sources';
  return [
    `Discovered ${inventory.projects.length} ${projectLabel} and ${sourceCount} ${sourceLabel}.`,
    ...inventory.projects.map(
      (project) =>
        `Project: ${project.projectId} config=${JSON.stringify(project.configPath)} sources=${project.sourceIds.join(',') || '-'}`,
    ),
    '',
  ].join('\n');
}

function formatCheckDifferences(result: WorkspaceCheckResult): string {
  return [
    'Contract artifacts are not current.',
    ...result.differences.map(
      (difference) =>
        `${difference.status === 'missing' ? 'Missing' : 'Stale'}: ${JSON.stringify(difference.path)}`,
    ),
    '',
  ].join('\n');
}

export async function runWorkspaceCli(
  argv: readonly string[],
  dependencies: WorkspaceCliDependencies = {},
): Promise<number> {
  const stdout = dependencies.stdout ?? process.stdout;
  const stderr = dependencies.stderr ?? process.stderr;
  const generate = dependencies.generate ?? runWorkspace;
  const list = dependencies.list ?? discoverWorkspaceProjects;
  const check = dependencies.check ?? checkWorkspace;
  const cwd = dependencies.cwd ?? (() => process.cwd());

  let command: ParsedWorkspaceCommand | 'help';
  try {
    command = parseWorkspaceCommand(argv, cwd);
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

  if (command.name === 'list') {
    try {
      const result = await list({
        workspaceRoot: command.workspaceRoot,
        rootConfigPath: command.rootConfigPath,
      });
      stdout.write(formatInventory(result.inventory));
      return 0;
    } catch (error) {
      const hint =
        error instanceof WorkspaceConfigLoadError &&
        error.code === 'CONFIG_LOAD_FAILED'
          ? 'Hint: verify tsconfigPath and import a Node-safe contracts entry point; Angular browser barrels may require a dedicated contracts shim.\n'
          : '';
      stderr.write(
        `List failed [WORKSPACE_DISCOVERY_FAILED]\nWorkspace discovery failed.\n${hint}`,
      );
      return 1;
    }
  }

  try {
    if (command.name === 'check') {
      const result = await check(workspaceOptions(command));
      if (result.differences.length > 0) {
        stderr.write(formatCheckDifferences(result));
        return 1;
      }
      const count = result.artifactPaths.length;
      stdout.write(
        `${count} ${count === 1 ? 'contract is' : 'contracts are'} current.\nIndex: ${result.indexPath}\n`,
      );
      return 0;
    }

    const result = await generate(workspaceOptions(command));
    const count = result.artifactPaths.length;
    stdout.write(
      `Generated ${count} ${count === 1 ? 'contract' : 'contracts'}.\nIndex: ${result.indexPath}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof WorkspaceGenerationError) {
      stderr.write(
        formatWorkspaceError(
          command.name === 'check' ? 'Check' : 'Generation',
          error,
        ),
      );
      return 1;
    }
    const operation = command.name === 'check' ? 'Check' : 'Generation';
    stderr.write(
      `${operation} failed [UNEXPECTED]\nWorkspace ${operation.toLowerCase()} failed.\n`,
    );
    return 1;
  }
}
