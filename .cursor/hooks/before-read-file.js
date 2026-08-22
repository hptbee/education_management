#!/usr/bin/env node
'use strict';

const { readStdin } = require('./adapter');

const SENSITIVE_PATH =
  /(?:^|[\\/])\.env(?:\.|$)|\.pem$|\.key$|credentials|secret/i;

readStdin()
  .then((raw) => {
    try {
      const input = JSON.parse(raw || '{}');
      const filePath = String(
        input.path || input.file || input.filePath || input.args?.filePath || '',
      );
      if (filePath && SENSITIVE_PATH.test(filePath)) {
        console.error(
          `[hooks] WARNING: Reading sensitive file: ${filePath}. Do not paste secrets into chat or commits.`,
        );
      }
    } catch {
      // non-critical
    }
    process.exit(0);
  })
  .catch(() => process.exit(0));
