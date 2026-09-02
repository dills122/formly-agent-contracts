import { isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type {
  RuntimeHostFailureCause,
  RuntimeHostFailureExplanation,
  RuntimeHostFailureFrame,
} from "./protocol.js";

const MAX_CAUSES = 3;
const MAX_FRAMES = 5;
const MAX_NAME_LENGTH = 64;
const MAX_MESSAGE_LENGTH = 400;
const MAX_PATH_LENGTH = 240;
const ANSI_ESCAPE_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/gu;
const DOUBLE_QUOTED_ABSOLUTE_PATH_PATTERN =
  /"(?:file:\/\/\/|\/|[A-Za-z]:[\\/])[^"\u0000-\u001f\u007f]*"/gu;
const SINGLE_QUOTED_ABSOLUTE_PATH_PATTERN =
  /'(?:file:\/\/\/|\/|[A-Za-z]:[\\/])[^'\u0000-\u001f\u007f]*'/gu;
const KEY_VALUE_ABSOLUTE_PATH_PATTERN =
  /(^|[\s(,;])([A-Za-z][A-Za-z0-9_.-]*\s*[=:]\s*)(?:file:\/\/\/|\/|[A-Za-z]:[\\/])[^\u0000-\u001f\u007f;,)\]}]+/gu;
const LABELED_ABSOLUTE_PATH_PATTERN =
  /(^|[\s(,;])((?:at|cache|cwd|directory|file|from|in|path|root)\s+)(?:file:\/\/\/|\/|[A-Za-z]:[\\/])[^\u0000-\u001f\u007f;,)\]}]+/giu;
const UNQUOTED_ABSOLUTE_PATH_PATTERN =
  /(^|[\s'"(=,:])(?:file:\/\/\/|\/(?!\/)|[A-Za-z]:[\\/])[^\s'"(),;)\]}]+/gu;

function truncate(input: string, maximumLength: number): string {
  const characters = Array.from(input);
  return characters.length <= maximumLength
    ? input
    : `${characters.slice(0, maximumLength - 1).join("")}…`;
}

function replaceAllLiteral(
  input: string,
  search: string,
  replacement: string
): string {
  return search.length === 0 ? input : input.split(search).join(replacement);
}

function workspaceSpellings(workspaceRoot: string): readonly string[] {
  const absoluteRoot = resolve(workspaceRoot);
  const normalizedRoot = absoluteRoot.replaceAll("\\", "/");
  const spellings = new Set([
    absoluteRoot,
    normalizedRoot,
    pathToFileURL(absoluteRoot).href,
  ]);
  return [...spellings].sort((left, right) => right.length - left.length);
}

function sanitizeText(input: string, workspaceRoot: string): string {
  let value = input.replace(ANSI_ESCAPE_PATTERN, "");
  for (const spelling of workspaceSpellings(workspaceRoot)) {
    value = replaceAllLiteral(value, spelling, ".");
  }
  value = value
    .replace(DOUBLE_QUOTED_ABSOLUTE_PATH_PATTERN, '"<external-path>"')
    .replace(SINGLE_QUOTED_ABSOLUTE_PATH_PATTERN, "'<external-path>'")
    .replace(KEY_VALUE_ABSOLUTE_PATH_PATTERN, "$1$2<external-path>")
    .replace(LABELED_ABSOLUTE_PATH_PATTERN, "$1$2<external-path>")
    .replace(UNQUOTED_ABSOLUTE_PATH_PATTERN, "$1<external-path>")
    .replace(/[\u0000-\u001f\u007f]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
  return truncate(value || "Unknown failure.", MAX_MESSAGE_LENGTH);
}

function isError(input: unknown): input is Error {
  try {
    return input instanceof Error;
  } catch {
    return false;
  }
}

function errorName(input: unknown): string {
  if (!isError(input)) return "Error";
  try {
    const name = input.name.replace(/[^A-Za-z0-9_.:-]/gu, "");
    return truncate(name || "Error", MAX_NAME_LENGTH);
  } catch {
    return "Error";
  }
}

function errorMessage(input: unknown, workspaceRoot: string): string {
  if (isError(input)) {
    try {
      return sanitizeText(input.message, workspaceRoot);
    } catch {
      return "An Error with an unreadable message was thrown.";
    }
  }
  if (typeof input === "string") return sanitizeText(input, workspaceRoot);
  return "A non-Error value was thrown.";
}

function nextCause(input: unknown): unknown {
  if (!isError(input)) return undefined;
  try {
    return input.cause;
  } catch {
    return undefined;
  }
}

function causes(
  input: unknown,
  workspaceRoot: string
): readonly RuntimeHostFailureCause[] {
  const result: RuntimeHostFailureCause[] = [];
  const visited = new Set<unknown>();
  let current: unknown = input;
  while (
    current !== undefined &&
    result.length < MAX_CAUSES &&
    !visited.has(current)
  ) {
    visited.add(current);
    result.push({
      name: errorName(current),
      message: errorMessage(current, workspaceRoot),
    });
    current = nextCause(current);
  }
  return result.length === 0
    ? [{ name: "Error", message: "Unknown failure." }]
    : result;
}

function stackValue(input: unknown): string | undefined {
  if (!isError(input)) return undefined;
  try {
    return typeof input.stack === "string" ? input.stack : undefined;
  } catch {
    return undefined;
  }
}

function absoluteFramePath(input: string): string | undefined {
  const value = input.startsWith("file:")
    ? (() => {
        try {
          return fileURLToPath(input);
        } catch {
          return undefined;
        }
      })()
    : input;
  return value !== undefined && isAbsolute(value) ? value : undefined;
}

function stackFrames(
  input: unknown,
  workspaceRoot: string
): readonly RuntimeHostFailureFrame[] {
  const root = resolve(workspaceRoot);
  const frames: RuntimeHostFailureFrame[] = [];
  const seen = new Set<string>();
  const visited = new Set<unknown>();
  let current: unknown = input;
  while (
    current !== undefined &&
    frames.length < MAX_FRAMES &&
    !visited.has(current)
  ) {
    visited.add(current);
    const stack = stackValue(current);
    if (stack !== undefined) {
      for (const line of stack.split(/\r?\n/u).slice(1)) {
        const match =
          /(?:\(|\s)((?:file:\/\/\/|\/|[A-Za-z]:\\).+):(\d+):(\d+)\)?$/u.exec(
            line.trim()
          );
        if (match === null) continue;
        const absolutePath = absoluteFramePath(match[1]!);
        if (absolutePath === undefined) continue;
        const relativePath = relative(root, absolutePath).replaceAll("\\", "/");
        if (
          relativePath.length === 0 ||
          relativePath === ".." ||
          relativePath.startsWith("../") ||
          isAbsolute(relativePath) ||
          Array.from(relativePath).length > MAX_PATH_LENGTH ||
          /[*?[\]{}]/u.test(relativePath) ||
          /[\u0000-\u001f\u007f]/u.test(relativePath)
        ) {
          continue;
        }
        const lineNumber = Number(match[2]);
        const columnNumber = Number(match[3]);
        if (
          !Number.isSafeInteger(lineNumber) ||
          lineNumber <= 0 ||
          !Number.isSafeInteger(columnNumber) ||
          columnNumber <= 0
        ) {
          continue;
        }
        const key = `${relativePath}:${match[2]}:${match[3]}`;
        if (seen.has(key)) continue;
        seen.add(key);
        frames.push({
          path: relativePath,
          line: lineNumber,
          column: columnNumber,
        });
        if (frames.length === MAX_FRAMES) break;
      }
    }
    current = nextCause(current);
  }
  return frames;
}

/** Creates bounded, local-only detail suitable for validated worker IPC. */
export function createRuntimeHostFailureExplanation(
  error: unknown,
  workspaceRoot: string
): RuntimeHostFailureExplanation {
  return {
    causes: causes(error, workspaceRoot),
    frames: stackFrames(error, workspaceRoot),
  };
}
