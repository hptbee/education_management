#!/usr/bin/env node
'use strict';

const { readStdin } = require('./adapter');

const SECRET_PATTERNS = [
  { name: 'OpenAI key', pattern: /sk-[a-zA-Z0-9]{20,}/ },
  { name: 'GitHub token', pattern: /ghp_[a-zA-Z0-9]{36,}/ },
  { name: 'AWS key', pattern: /AKIA[A-Z0-9]{16}/ },
  { name: 'Slack token', pattern: /xox[bpsa]-[a-zA-Z0-9-]+/ },
  { name: 'Private key', pattern: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/ },
];

readStdin()
  .then((raw) => {
    try {
      const input = JSON.parse(raw || '{}');
      const prompt =
        input.prompt || input.content || input.message || input.text || '';
      for (const { name, pattern } of SECRET_PATTERNS) {
        if (pattern.test(prompt)) {
          console.error(
            `[hooks] WARNING: Possible ${name} in prompt. Remove secrets; use env vars instead.`,
          );
          break;
        }
      }
    } catch {
      // non-critical parse failure — allow
    }
    process.exit(0);
  })
  .catch(() => process.exit(0));
