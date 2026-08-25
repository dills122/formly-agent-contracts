import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';

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
const markdownFiles = [];

function collectMarkdownFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const candidate = resolve(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      collectMarkdownFiles(candidate);
    } else if (entry.isFile() && extname(candidate) === '.md') {
      markdownFiles.push(candidate);
    }
  }
}

collectMarkdownFiles('.');

const failures = [];
const inlineLink = /\[[^\]]*\]\(([^)]+)\)/g;

for (const file of markdownFiles) {
  const contents = readFileSync(file, 'utf8');
  const lines = contents.split('\n');

  lines.forEach((line, index) => {
    if (/[\t ]+$/.test(line)) {
      failures.push(`${file}:${index + 1}: trailing whitespace`);
    }
  });

  for (const match of contents.matchAll(inlineLink)) {
    const target = match[1];
    if (/^(?:https?:|mailto:|#)/.test(target)) {
      continue;
    }

    const path = target.split('#', 1)[0];
    const resolved = resolve(dirname(file), decodeURIComponent(path));
    if (!existsSync(resolved)) {
      failures.push(`${file}: broken local link: ${target}`);
    }
  }
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Documentation checks passed for ${markdownFiles.length} files.`);
}
