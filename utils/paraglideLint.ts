import fs from 'node:fs';
import path from 'node:path';

const messagesDir = './messages';
const sourceDirs = ['./src'];

const sourceExtensions = new Set(['.ts', '.js', '.svelte', '.tsx', '.jsx']);

function getFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getFiles(fullPath));
    } else if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

// Get message keys from the first locale file
const messageFile = fs.readdirSync(messagesDir).find((file) => file.endsWith('.json'));

if (!messageFile) {
  throw new Error(`No JSON message file found in ${messagesDir}`);
}

const messages = JSON.parse(fs.readFileSync(path.join(messagesDir, messageFile), 'utf8'));

const messageKeys = Object.keys(messages);

// Find references such as:
// m.foo()
// m["foo"]()
// m['foo']()
const usedMessages = new Set<string>();

for (const dir of sourceDirs) {
  for (const file of getFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');

    for (const match of content.matchAll(/\bm\.([A-Za-z_$][\w$]*)\s*\(/g)) {
      usedMessages.add(match[1]);
    }

    for (const match of content.matchAll(/\bm\[['"]([^'"]+)['"]\]\s*\(/g)) {
      usedMessages.add(match[1]);
    }
  }
}

const unused = messageKeys.filter((key) => !usedMessages.has(key));

console.log(`Total messages: ${messageKeys.length}`);
console.log(`Used messages:  ${messageKeys.length - unused.length}`);
console.log(`Unused messages: ${unused.length}`);

if (unused.length) {
  console.log('\nUnused messages:');

  for (const key of unused.sort()) {
    console.log(`  ${key}`);
  }
}
