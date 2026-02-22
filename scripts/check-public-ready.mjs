#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const trackedFiles = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => !file.startsWith('dist/'))
  .filter((file) => !file.startsWith('node_modules/'));

const suspiciousPatterns = [
  { name: 'OpenAI key', regex: /sk-(proj-)?[A-Za-z0-9_-]{32,}/g },
  { name: 'Gemini key', regex: /AIza[0-9A-Za-z_-]{20,}/g },
  { name: 'Hardcoded API key env assignment', regex: /(OPENAI|GEMINI|VITE_OPENAI|VITE_GEMINI)_API_KEY\s*=\s*["']?[A-Za-z0-9_-]{12,}/g },
];

const allowlistSnippets = [
  'your-openai-api-key-here',
  'your-gemini-api-key-here',
  'your_key_here',
  'OPENAI_API_KEY=',
  'GEMINI_API_KEY=',
];

const findings = [];

for (const file of trackedFiles) {
  let content = '';
  try {
    content = readFileSync(resolve(process.cwd(), file), 'utf8');
  } catch {
    continue;
  }

  for (const { name, regex } of suspiciousPatterns) {
    const matches = [...content.matchAll(regex)];
    for (const match of matches) {
      const value = String(match[0] || '');
      const lower = value.toLowerCase();
      const looksLikeRealOpenAI = name !== 'OpenAI key' || (/[0-9]/.test(value) && /[A-Za-z]/.test(value));
      const allowed = allowlistSnippets.some((item) => lower.includes(item.toLowerCase())) || !looksLikeRealOpenAI;
      if (!allowed) {
        findings.push({ file, name, value: value.slice(0, 24) + (value.length > 24 ? '...' : '') });
      }
    }
  }
}

if (findings.length === 0) {
  console.log('Public readiness check passed: no obvious hardcoded secrets found in tracked files.');
  process.exit(0);
}

console.error(`Public readiness check failed: found ${findings.length} potential secret(s):`);
for (const finding of findings.slice(0, 80)) {
  console.error(`- ${finding.file} | ${finding.name} | ${finding.value}`);
}
process.exit(1);
