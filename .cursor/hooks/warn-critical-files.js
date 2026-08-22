#!/usr/bin/env node
'use strict';

/**
 * preToolUse: ask before editing critical infrastructure files.
 * Serena MCP symbol edits may bypass this hook.
 */

const { readStdin } = require('./adapter');
const path = require('path');

const CRITICAL_PATTERNS = [
  /^src\/app\/layout\.tsx$/i,
  /^components\/sidebar\.tsx$/i,
  /^src\/database\//i,
  /^workers\/cloud-backup\//i,
  /^src-tauri\/tauri\.conf\.json$/i,
  /^src-tauri\/Cargo\.toml$/i,
  /^src-tauri\/src\/lib\.rs$/i,
  /^src-tauri\/src\/main\.rs$/i,
];

function normalizePath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/^\/+/, '');
}

function isCritical(filePath) {
  const normalized = normalizePath(filePath);
  return CRITICAL_PATTERNS.some((re) => re.test(normalized));
}

function extractFilePath(input) {
  const candidates = [
    input.path,
    input.file,
    input.filePath,
    input.file_path,
    input.tool_input?.path,
    input.tool_input?.file_path,
    input.tool_input?.target_file,
    input.args?.path,
    input.args?.filePath,
    input.args?.file_path,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      return c;
    }
  }
  return '';
}

readStdin()
  .then((raw) => {
    try {
      const input = JSON.parse(raw || '{}');
      const filePath = extractFilePath(input);
      if (filePath && isCritical(filePath)) {
        const rel = normalizePath(filePath);
        const payload = {
          permission: 'ask',
          user_message: `[hooks] Editing critical file: ${rel}. Confirm this change is intentional.`,
          agent_message: `Critical infrastructure file: ${rel}. Verify shell/persistence/Worker/Tauri impact.`,
        };
        process.stdout.write(JSON.stringify(payload));
        process.exit(0);
      }
    } catch {
      // non-critical parse failure — allow
    }
    process.stdout.write(JSON.stringify({ permission: 'allow' }));
    process.exit(0);
  })
  .catch(() => {
    process.stdout.write(JSON.stringify({ permission: 'allow' }));
    process.exit(0);
  });
