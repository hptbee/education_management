#!/usr/bin/env node
'use strict';

/**
 * beforeShellExecution: ask before destructive git commands.
 * Does not auto-deny — user can approve when intentional.
 */

const { readStdin } = require('./adapter');

const DANGEROUS_PATTERNS = [
  {
    name: 'git reset --hard',
    pattern: /\bgit\b[\s\S]*?\breset\b[\s\S]*?--hard\b/i,
    message: 'git reset --hard discards uncommitted changes. Confirm this is intentional.',
  },
  {
    name: 'git clean -fd',
    pattern: /\bgit\b[\s\S]*?\bclean\b[\s\S]*?-(?:f[^\s]*d|d[^\s]*f)/i,
    message: 'git clean -fd removes untracked files. Confirm this is intentional.',
  },
  {
    name: 'git push --force',
    pattern: /\bgit\b[\s\S]*?\bpush\b[\s\S]*?--force(?:-with-lease)?\b/i,
    message: 'git push --force rewrites remote history. Confirm this is intentional.',
  },
];

function extractCommand(raw) {
  const trimmed = String(raw || '').trim();
  if (!trimmed.startsWith('{')) return trimmed;
  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed.command ||
      parsed.tool_input?.command ||
      parsed.cmd ||
      parsed.input ||
      parsed.shell ||
      trimmed
    );
  } catch {
    return trimmed;
  }
}

readStdin()
  .then((raw) => {
    const command = extractCommand(raw);
    for (const { name, pattern, message } of DANGEROUS_PATTERNS) {
      if (pattern.test(command)) {
        const payload = {
          permission: 'ask',
          user_message: `[hooks] ${message}`,
          agent_message: `Hook flagged: ${name}. Proceed only if the user confirmed.`,
        };
        process.stdout.write(JSON.stringify(payload));
        process.exit(0);
      }
    }
    process.stdout.write(JSON.stringify({ permission: 'allow' }));
    process.exit(0);
  })
  .catch(() => {
    process.stdout.write(JSON.stringify({ permission: 'allow' }));
    process.exit(0);
  });
