import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  dirname,
  extname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';
import { pathToFileURL, URL } from 'node:url';

const ignoredDirectories = new Set([
  '.git',
  '.angular',
  '.cache',
  '.nx',
  '.turbo',
  'build',
  'coverage',
  'dist',
  'node_modules',
]);
const inlineLink = /\[[^\]]*\]\(([^)]+)\)/gu;
const htmlHref = /href=(['"])(.*?)\1/gu;
const repositoryPath =
  /^\/dills122\/formly-contract\/(?:blob|tree)\/main\/(.+)$/u;

function collectMarkdownFiles(directory, markdownFiles) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const candidate = resolve(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      collectMarkdownFiles(candidate, markdownFiles);
    } else if (entry.isFile() && extname(candidate) === '.md') {
      markdownFiles.push(candidate);
    }
  }
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}

function isInside(root, candidate) {
  const path = relative(root, candidate);
  return (
    path === '' ||
    (path !== '..' && !path.startsWith(`..${sep}`) && !isAbsolute(path))
  );
}

function headingSlugs(contents) {
  const slugs = new Set();
  const occurrences = new Map();
  for (const line of contents.split('\n')) {
    const match = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/u.exec(line);
    if (!match) continue;
    const base = match[1]
      .replace(/!\[([^\]]*)\]\([^)]*\)/gu, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/gu, '$1')
      .replace(/<[^>]+>/gu, '')
      .replace(/[`*_~]/gu, '')
      .toLowerCase()
      .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
      .trim()
      .replace(/\s+/gu, '-');
    if (!base) continue;
    const occurrence = occurrences.get(base) ?? 0;
    occurrences.set(base, occurrence + 1);
    slugs.add(occurrence === 0 ? base : `${base}-${occurrence}`);
  }
  return slugs;
}

function validateFragment({ file, fragment, source, failures, contentsByFile }) {
  if (!fragment || extname(file) !== '.md') return;
  const decoded = safeDecode(fragment);
  if (decoded === undefined) {
    failures.push(`${source}: invalid encoded heading fragment: #${fragment}`);
    return;
  }
  const contents = contentsByFile.get(file) ?? readFileSync(file, 'utf8');
  contentsByFile.set(file, contents);
  if (!headingSlugs(contents).has(decoded)) {
    failures.push(`${source}: missing heading fragment: #${decoded}`);
  }
}

function validateLocalLink({
  file,
  target,
  root,
  failures,
  contentsByFile,
}) {
  if (/^(?:mailto:|tel:)/u.test(target)) return;

  if (/^https?:/u.test(target)) {
    let url;
    try {
      url = new URL(target);
    } catch {
      failures.push(`${file}: malformed URL: ${target}`);
      return;
    }
    if (url.origin !== 'https://github.com') return;
    const match = repositoryPath.exec(url.pathname);
    if (!match) return;
    const decodedPath = safeDecode(match[1]);
    const candidate =
      decodedPath === undefined ? undefined : resolve(root, decodedPath);
    if (
      candidate === undefined ||
      !isInside(root, candidate) ||
      !existsSync(candidate)
    ) {
      failures.push(`${file}: broken repository link: ${target}`);
      return;
    }
    validateFragment({
      file: candidate,
      fragment: url.hash.slice(1),
      source: file,
      failures,
      contentsByFile,
    });
    return;
  }

  const [pathPart, fragment = ''] = target.split('#', 2);
  const decodedPath = safeDecode(pathPart.split('?', 1)[0]);
  const candidate =
    decodedPath === undefined
      ? undefined
      : decodedPath === ''
        ? file
        : resolve(dirname(file), decodedPath);
  if (candidate === undefined || !existsSync(candidate)) {
    failures.push(`${file}: broken local link: ${target}`);
    return;
  }
  validateFragment({
    file: candidate,
    fragment,
    source: file,
    failures,
    contentsByFile,
  });
}

function pageRoute(file, siteContentRoot) {
  const path = relative(siteContentRoot, file).split(sep).join('/');
  if (path === 'index.md') return '/';
  if (path.endsWith('/index.md')) {
    return `/${path.slice(0, -'/index.md'.length)}/`;
  }
  return `/${path.replace(/\.md$/u, '')}/`;
}

function validateSiteHref({
  file,
  target,
  siteContentRoot,
  failures,
  contentsByFile,
}) {
  if (/^(?:https?:|mailto:|tel:)/u.test(target)) return;
  if (target.startsWith('#')) {
    validateFragment({
      file,
      fragment: target.slice(1),
      source: file,
      failures,
      contentsByFile,
    });
    return;
  }

  let route;
  try {
    route = new URL(target, `https://docs.invalid${pageRoute(file, siteContentRoot)}`);
  } catch {
    failures.push(`${file}: malformed site route: ${target}`);
    return;
  }
  const decodedPath = safeDecode(route.pathname.replace(/^\/+|\/+$/gu, ''));
  if (decodedPath === undefined) {
    failures.push(`${file}: malformed site route: ${target}`);
    return;
  }
  const candidates =
    decodedPath === ''
      ? [resolve(siteContentRoot, 'index.md')]
      : [
          resolve(siteContentRoot, `${decodedPath}.md`),
          resolve(siteContentRoot, decodedPath, 'index.md'),
        ];
  const candidate = candidates.find(
    (entry) => isInside(siteContentRoot, entry) && existsSync(entry),
  );
  if (!candidate) {
    failures.push(`${file}: broken site route: ${target}`);
    return;
  }
  validateFragment({
    file: candidate,
    fragment: route.hash.slice(1),
    source: file,
    failures,
    contentsByFile,
  });
}

export function validateDocumentation(directory = '.') {
  const root = resolve(directory);
  const markdownFiles = [];
  collectMarkdownFiles(root, markdownFiles);
  const failures = [];
  const contentsByFile = new Map();
  const siteContentRoot = resolve(root, 'apps/docs/src/content/docs');

  for (const file of markdownFiles) {
    const contents = readFileSync(file, 'utf8');
    contentsByFile.set(file, contents);
    const lines = contents.split('\n');

    lines.forEach((line, index) => {
      if (/[\t ]+$/u.test(line)) {
        failures.push(`${file}:${index + 1}: trailing whitespace`);
      }
    });

    for (const match of contents.matchAll(inlineLink)) {
      const target = match[1];
      if (
        isInside(siteContentRoot, file) &&
        !/^(?:https?:|mailto:|tel:)/u.test(target)
      ) {
        validateSiteHref({
          file,
          target,
          siteContentRoot,
          failures,
          contentsByFile,
        });
      } else {
        validateLocalLink({
          file,
          target,
          root,
          failures,
          contentsByFile,
        });
      }
    }

    if (isInside(siteContentRoot, file)) {
      for (const match of contents.matchAll(htmlHref)) {
        validateSiteHref({
          file,
          target: match[2],
          siteContentRoot,
          failures,
          contentsByFile,
        });
      }
    }
  }

  return failures;
}

const invokedPath = process.argv[1] && resolve(process.argv[1]);
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const failures = validateDocumentation('.');
  if (failures.length > 0) {
    console.error(failures.join('\n'));
    process.exitCode = 1;
  } else {
    const markdownFiles = [];
    collectMarkdownFiles(resolve('.'), markdownFiles);
    console.log(`Documentation checks passed for ${markdownFiles.length} files.`);
  }
}
