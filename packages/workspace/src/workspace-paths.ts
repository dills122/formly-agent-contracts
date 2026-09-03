import { realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * @internal Shared by discover-projects.ts and run-workspace.ts: the
 * built-in default for a project/root `output.directory` when none is
 * configured. Not part of the package barrel.
 */
export const DEFAULT_OUTPUT_DIRECTORY = 'dist/formly-contracts';

/**
 * @internal Shared by discover-projects.ts and run-workspace.ts to check
 * whether a resolved absolute path stays inside the workspace root (used to
 * reject output/config paths that escape it via `..` segments or an
 * absolute override). Not part of the package barrel.
 */
export function isWithinWorkspace(
  workspaceRoot: string,
  candidatePath: string,
): boolean {
  const relativePath = relative(workspaceRoot, candidatePath);
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${sep}`) &&
      !isAbsolute(relativePath))
  );
}

/**
 * @internal Resolves an existing workspace path through symlinks and returns
 * its canonical workspace-relative spelling. Throws when either lexical or
 * real path escapes the canonical workspace root.
 */
export async function canonicalWorkspaceRelativePath(
  workspaceRoot: string,
  workspacePath: string,
): Promise<string> {
  const canonicalRoot = await realpath(resolve(workspaceRoot));
  const absolutePath = resolve(canonicalRoot, workspacePath);
  if (!isWithinWorkspace(canonicalRoot, absolutePath)) {
    throw new RangeError('Workspace path is outside the workspace root.');
  }
  const canonicalPath = await realpath(absolutePath);
  if (!isWithinWorkspace(canonicalRoot, canonicalPath)) {
    throw new RangeError('Workspace path resolves outside the workspace root.');
  }
  const relativePath = relative(canonicalRoot, canonicalPath)
    .split(sep)
    .join('/');
  return relativePath === '' ? '.' : relativePath;
}

/**
 * @internal Shared code-unit string comparator used to sort ids/paths into
 * a stable, deterministic order. Not part of the package barrel.
 */
export function compareCodeUnits(left: string, right: string): number {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

/**
 * @internal Shared by discover-projects.ts and run-workspace.ts to read the
 * `code` off a Node.js `ErrnoException`-shaped error without assuming its
 * type. Not part of the package barrel.
 */
export function errnoCode(error: unknown): unknown {
  return typeof error === 'object' && error !== null && 'code' in error
    ? error.code
    : undefined;
}
